"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SessionRole = "PRESENTER" | "TECHNICAL_REVIEWER" | "FEEDBACK_STRATEGIST";

type DimensionMeta = {
  name: string;
  desc?: string;
  anchor?: string;
};

type Student = {
  id: string;
  rollNumber: string;
  name: string;
};

type SessionDetail = {
  id: string;
  status: string;
  cycleId: string;
  batch: { id: string; label: string; departmentId: string; students: Student[] };
  course: { code: string; name: string };
};

type Rubric = {
  id: string;
  role: SessionRole;
  name: string;
  dimensions: DimensionMeta[];
};

type GradeRecord = {
  id: string;
  studentId: string;
  role: SessionRole;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dimensionScores: Record<string, any>;
  totalScore: number;
  maxScore: number;
  status: "DRAFT" | "FINALIZED";
  gradedAt: string | null;
};

type Props = {
  cycleId: string;
  sessionId: string;
};

const ROLE_LABELS: Record<SessionRole, string> = {
  PRESENTER: "Presenter",
  TECHNICAL_REVIEWER: "Technical Reviewer",
  FEEDBACK_STRATEGIST: "Feedback Strategist",
};

export function GradeEntryClient({ cycleId, sessionId }: Props) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [records, setRecords] = useState<GradeRecord[]>([]);

  const [activeRole, setActiveRole] = useState<SessionRole>("PRESENTER");
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [savingStudent, setSavingStudent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/sessions/${sessionId}/grades`, { cache: "no-store" });
      const data = (await res.json()) as {
        error?: string;
        session?: SessionDetail;
        rubrics?: Rubric[];
        gradeRecords?: GradeRecord[];
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load grade entry data");
      }

      const nextSession = data.session ?? null;
      const nextRubrics = data.rubrics ?? [];
      const nextRecords = data.gradeRecords ?? [];

      setSession(nextSession);
      setRubrics(nextRubrics);
      setRecords(nextRecords);

      const defaultRole = (nextRubrics[0]?.role ?? "PRESENTER") as SessionRole;
      setActiveRole(defaultRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, sessionId]);

  const activeRubric = useMemo(() => {
    return rubrics.find((r) => r.role === activeRole) ?? null;
  }, [rubrics, activeRole]);

  const studentRows = useMemo(() => {
    if (!session || !activeRubric) {
      return [] as Array<{
        student: Student;
        record: GradeRecord | null;
        progress: { gradedRoles: number; finalizedRoles: number; percent: number };
      }>;
    }

    const roleList: SessionRole[] = ["PRESENTER", "TECHNICAL_REVIEWER", "FEEDBACK_STRATEGIST"];

    return session.batch.students.map((student) => ({
      student,
      record: records.find((r) => r.role === activeRole && r.studentId === student.id) ?? null,
      progress: (() => {
        const all = records.filter((r) => r.studentId === student.id && roleList.includes(r.role));
        const finalizedRoles = new Set(all.filter((r) => r.status === "FINALIZED").map((r) => r.role)).size;
        const gradedRoles = new Set(all.map((r) => r.role)).size;
        return {
          gradedRoles,
          finalizedRoles,
          percent: Math.round((gradedRoles / roleList.length) * 100),
        };
      })(),
    }));
  }, [session, activeRubric, records, activeRole]);

  function getInputValue(studentId: string, dimension: string, fallback: string): string {
    return draft[studentId]?.[dimension] ?? fallback;
  }

  function updateInput(studentId: string, dimension: string, value: string) {
    setDraft((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] ?? {}),
        [dimension]: value,
      },
    }));
  }

  async function saveStudent(studentId: string) {
    if (!activeRubric) {
      return;
    }

    const scorePayload: Record<string, number> = {};
    for (const dim of activeRubric.dimensions) {
      const source = (draft[studentId]?.[dim.name] ?? "").trim();
      const parsed = Number(source);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5) {
        setError(`Enter valid 0-5 score for ${dim.name}`);
        return;
      }
      scorePayload[dim.name] = parsed;
    }

    setSavingStudent(studentId);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/sessions/${sessionId}/grades`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          role: activeRole,
          dimensionScores: scorePayload,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save grade");
      }

      setMessage("Grade saved.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save grade");
    } finally {
      setSavingStudent(null);
    }
  }

  async function finalizeRole() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/sessions/${sessionId}/grades/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: activeRole }),
      });

      const data = (await res.json()) as { error?: string; allRolesFinalized?: boolean };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to finalize role grades");
      }

      setMessage(data.allRolesFinalized ? "All roles finalized. Session is locked." : `${ROLE_LABELS[activeRole]} grades finalized.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize role grades");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/cycles/${cycleId}`} className="text-sm font-medium text-slate-700 hover:underline">
              Back to Cycle Detail
            </Link>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Grade Entry</h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter role-wise rubric scores (0-5 per dimension), then finalize each role.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </header>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
        {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}

        {session ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-4">
              <div><span className="font-semibold">Session:</span> {session.id}</div>
              <div><span className="font-semibold">Status:</span> {session.status}</div>
              <div><span className="font-semibold">Batch:</span> {session.batch.label} ({session.batch.departmentId})</div>
              <div><span className="font-semibold">Course:</span> {session.course.code}</div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as SessionRole)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {rubrics.map((r) => (
                  <option key={r.role} value={r.role}>{ROLE_LABELS[r.role]}</option>
                ))}
              </select>
              <button
                onClick={finalizeRole}
                disabled={loading || session.status === "LOCKED"}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                Finalize {ROLE_LABELS[activeRole]} Grades
              </button>
            </div>

            {activeRubric ? (
              <p className="mt-3 text-xs text-slate-600">
                Active rubric: <span className="font-semibold text-slate-900">{activeRubric.name}</span> ·
                Dimensions: {activeRubric.dimensions.map((d) => d.name).join(", ")}
              </p>
            ) : (
              <p className="mt-3 text-xs text-rose-700">No active rubric found for selected role.</p>
            )}
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Roll No</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Progress</th>
                  {activeRubric?.dimensions.map((d) => (
                    <th key={d.name} className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span>{d.name} (0-5)</span>
                        {d.desc ? (
                          <span
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-600"
                            title={`${d.desc}${d.anchor ? ` | Anchor: ${d.anchor}` : ""}`}
                          >
                            ?
                          </span>
                        ) : null}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {studentRows.length === 0 ? (
                  <tr>
                    <td colSpan={8 + (activeRubric?.dimensions.length ?? 0)} className="px-3 py-8 text-center text-slate-500">No students found for this session batch.</td>
                  </tr>
                ) : (
                  studentRows.map(({ student, record, progress }) => (
                    <tr key={student.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{student.rollNumber}</td>
                      <td className="px-3 py-2">{student.name}</td>
                      <td className="px-3 py-2">
                        <div className="w-28">
                          <div className="h-2 overflow-hidden rounded bg-slate-200">
                            <div className="h-full bg-emerald-500" style={{ width: `${progress.percent}%` }} />
                          </div>
                          <div className="mt-1 text-[11px] text-slate-600">
                            {progress.gradedRoles}/3 graded · {progress.finalizedRoles}/3 finalized
                          </div>
                        </div>
                      </td>
                      {activeRubric?.dimensions.map((d) => {
                        const existing = record?.dimensionScores?.[d.name];
                        return (
                          <td key={d.name} className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              step={1}
                              value={getInputValue(student.id, d.name, existing == null ? "" : String(existing))}
                              onChange={(e) => updateInput(student.id, d.name, e.target.value)}
                              disabled={record?.status === "FINALIZED" || session?.status === "LOCKED"}
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2">{record ? `${record.totalScore}/${record.maxScore}` : "-"}</td>
                      <td className="px-3 py-2">{record?.status ?? "NOT_GRADED"}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => saveStudent(student.id)}
                          disabled={!activeRubric || savingStudent === student.id || record?.status === "FINALIZED" || session?.status === "LOCKED"}
                          className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {savingStudent === student.id ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
