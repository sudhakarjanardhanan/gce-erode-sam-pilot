"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CycleStatus = "DRAFT" | "ACTIVE" | "LOCKED" | "COMPLETED";
type SessionStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";

type CycleDto = {
  id: string;
  name: string;
  academicYear: string;
  semesterLabel: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  _count: { sessionPlans: number };
};

type SessionDto = {
  id: string;
  cycleId: string;
  batchId: string;
  courseId: string;
  facultyId: string;
  blockIndex: number;
  sessionIndex: number;
  date: string | null;
  status: SessionStatus;
  batch: { label: string };
  course: { code: string; name: string };
  faculty: { name: string; staffCode: string };
};

type BatchOption = {
  id: string;
  label: string;
  year: number;
  semester: number;
  regulation: string;
  departmentId: string;
};

type CourseOption = {
  id: string;
  code: string;
  name: string;
  semester: number;
  regulation: string;
  departmentId: string;
};

type FacultyOption = {
  id: string;
  name: string;
  staffCode: string;
  departmentId: string;
};

type Props = {
  cycleId: string;
};

function dateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function CycleDetailClient({ cycleId }: Props) {
  const [cycle, setCycle] = useState<CycleDto | null>(null);
  const [sessions, setSessions] = useState<SessionDto[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [faculty, setFaculty] = useState<FacultyOption[]>([]);

  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semesterLabel, setSemesterLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [batchId, setBatchId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [blockIndex, setBlockIndex] = useState(1);
  const [sessionIndex, setSessionIndex] = useState(1);
  const [sequenceAutoMode, setSequenceAutoMode] = useState(true);
  const [sessionDate, setSessionDate] = useState("");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("PLANNED");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      if (a.blockIndex !== b.blockIndex) {
        return a.blockIndex - b.blockIndex;
      }
      return a.sessionIndex - b.sessionIndex;
    });
  }, [sessions]);

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === batchId) ?? null,
    [batches, batchId],
  );

  const filteredCourses = useMemo(() => {
    if (!selectedBatch) {
      return [] as CourseOption[];
    }

    const exact = courses.filter(
      (c) =>
        c.departmentId === selectedBatch.departmentId &&
        c.semester === selectedBatch.semester &&
        c.regulation === selectedBatch.regulation,
    );
    if (exact.length > 0) {
      return exact;
    }

    const bySemester = courses.filter(
      (c) =>
        c.departmentId === selectedBatch.departmentId &&
        c.semester === selectedBatch.semester,
    );
    if (bySemester.length > 0) {
      return bySemester;
    }

    return courses.filter((c) => c.departmentId === selectedBatch.departmentId);
  }, [courses, selectedBatch]);

  const filteredFaculty = useMemo(() => {
    if (!selectedBatch) {
      return [] as FacultyOption[];
    }
    return faculty.filter((f) => f.departmentId === selectedBatch.departmentId);
  }, [faculty, selectedBatch]);

  const suggestedSequence = useMemo(() => {
    if (!selectedBatch) {
      return {
        blockIndex: 1,
        sessionIndex: 1,
        note: "Select a batch to get sequence suggestions.",
      };
    }

    const relevant = sessions
      .filter((s) => s.batchId === selectedBatch.id && (!courseId || s.courseId === courseId))
      .sort((a, b) => {
        if (a.blockIndex !== b.blockIndex) {
          return a.blockIndex - b.blockIndex;
        }
        return a.sessionIndex - b.sessionIndex;
      });

    if (relevant.length === 0) {
      return {
        blockIndex: 1,
        sessionIndex: 1,
        note: courseId
          ? "No existing sessions for this batch and course. Starting at Block 1 / Session 1."
          : "No existing sessions for this batch yet. Starting at Block 1 / Session 1.",
      };
    }

    const last = relevant[relevant.length - 1];
    const rollsOver = last.sessionIndex >= 3;

    return {
      blockIndex: rollsOver ? last.blockIndex + 1 : last.blockIndex,
      sessionIndex: rollsOver ? 1 : last.sessionIndex + 1,
      note: `Based on last planned entry B${last.blockIndex}/S${last.sessionIndex}.`,
    };
  }, [selectedBatch, sessions, courseId]);

  useEffect(() => {
    if (!sequenceAutoMode) {
      return;
    }
    setBlockIndex(suggestedSequence.blockIndex);
    setSessionIndex(suggestedSequence.sessionIndex);
  }, [sequenceAutoMode, suggestedSequence]);

  useEffect(() => {
    if (!selectedBatch) {
      return;
    }
    setSequenceAutoMode(true);
  }, [batchId, courseId, selectedBatch]);

  useEffect(() => {
    if (!selectedBatch) {
      setCourseId("");
      setFacultyId("");
      return;
    }

    if (courseId && !filteredCourses.some((c) => c.id === courseId)) {
      setCourseId("");
    }

    if (facultyId && !filteredFaculty.some((f) => f.id === facultyId)) {
      setFacultyId("");
    }
  }, [selectedBatch, courseId, facultyId, filteredCourses, filteredFaculty]);

  async function loadAll() {
    setLoading(true);
    setError(null);

    try {
      const [cycleRes, sessionsRes, optionsRes] = await Promise.all([
        fetch(`/api/cycles/${cycleId}`, { cache: "no-store" }),
        fetch(`/api/cycles/${cycleId}/sessions`, { cache: "no-store" }),
        fetch("/api/cycles/options", { cache: "no-store" }),
      ]);

      const cycleData = (await cycleRes.json()) as { error?: string; cycle?: CycleDto };
      const sessionsData = (await sessionsRes.json()) as { error?: string; sessions?: SessionDto[] };
      const optionsData = (await optionsRes.json()) as {
        error?: string;
        batches?: BatchOption[];
        courses?: CourseOption[];
        faculty?: FacultyOption[];
      };

      if (!cycleRes.ok) {
        throw new Error(cycleData.error ?? "Failed to load cycle");
      }
      if (!sessionsRes.ok) {
        throw new Error(sessionsData.error ?? "Failed to load sessions");
      }
      if (!optionsRes.ok) {
        throw new Error(optionsData.error ?? "Failed to load dropdown options");
      }

      const nextCycle = cycleData.cycle ?? null;
      setCycle(nextCycle);
      setSessions(sessionsData.sessions ?? []);
      setBatches(optionsData.batches ?? []);
      setCourses(optionsData.courses ?? []);
      setFaculty(optionsData.faculty ?? []);

      if (nextCycle) {
        setName(nextCycle.name);
        setAcademicYear(nextCycle.academicYear);
        setSemesterLabel(nextCycle.semesterLabel);
        setStartDate(dateInput(nextCycle.startDate));
        setEndDate(dateInput(nextCycle.endDate));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cycle detail");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  async function saveCycle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, academicYear, semesterLabel, startDate, endDate }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save cycle");
      }
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save cycle");
    } finally {
      setLoading(false);
    }
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          courseId,
          facultyId,
          blockIndex,
          sessionIndex,
          date: sessionDate || undefined,
          status: sessionStatus,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create session plan");
      }

      await loadAll();
      setSequenceAutoMode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session plan");
    } finally {
      setLoading(false);
    }
  }

  async function changeSessionStatus(sessionId: string, status: SessionStatus) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update session status");
      }
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update session status");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSession(sessionId: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/sessions/${sessionId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete session plan");
      }
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/cycles" className="text-sm font-medium text-slate-700 hover:underline">Back to Cycles</Link>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Cycle Detail</h1>
            <p className="mt-1 text-sm text-slate-600">Edit cycle metadata and maintain session plans.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`/cycles/${cycleId}/teams`} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                Teams
              </Link>
              <Link href={`/cycles/${cycleId}/assignments`} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                Assignments
              </Link>
            </div>
          </div>
          <button onClick={loadAll} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Refresh</button>
        </header>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}

        {cycle ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 text-sm text-slate-600">Current status: <span className="font-semibold text-slate-900">{cycle.status}</span></div>
            <form className="grid grid-cols-1 gap-3 md:grid-cols-5" onSubmit={saveCycle}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cycle name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="Academic year" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <input value={semesterLabel} onChange={(e) => setSemesterLabel(e.target.value)} placeholder="Semester label" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              <button disabled={loading} className="md:col-span-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{loading ? "Saving..." : "Save Cycle"}</button>
            </form>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add Session Plan</h2>
          <p className="mt-1 text-sm text-slate-600">
            Start by selecting a batch. Course and faculty lists are automatically narrowed to that
            batch&apos;s department and semester.
          </p>
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6" onSubmit={createSession}>
            <select
              value={batchId}
              onChange={(e) => {
                setBatchId(e.target.value);
                setSequenceAutoMode(true);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select batch</option>
              {batches.length === 0 ? <option value="" disabled>No batches found</option> : null}
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.label} · Sem {b.semester} · {b.departmentId}</option>
              ))}
            </select>
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setSequenceAutoMode(true);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
              disabled={!selectedBatch}
            >
              <option value="">{selectedBatch ? "Select course" : "Select batch first"}</option>
              {selectedBatch && filteredCourses.length === 0 ? <option value="" disabled>No matching courses found</option> : null}
              {filteredCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
              ))}
            </select>
            <select
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
              disabled={!selectedBatch}
            >
              <option value="">{selectedBatch ? "Select faculty" : "Select batch first"}</option>
              {selectedBatch && filteredFaculty.length === 0 ? <option value="" disabled>No faculty found for this department</option> : null}
              {filteredFaculty.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.staffCode})</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={blockIndex}
              onChange={(e) => {
                setSequenceAutoMode(false);
                setBlockIndex(Number(e.target.value));
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Block"
              required
            />
            <input
              type="number"
              min={1}
              value={sessionIndex}
              onChange={(e) => {
                setSequenceAutoMode(false);
                setSessionIndex(Number(e.target.value));
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Session"
              required
            />
            <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select value={sessionStatus} onChange={(e) => setSessionStatus(e.target.value as SessionStatus)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2">
              <option value="PLANNED">PLANNED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="LOCKED">LOCKED</option>
            </select>
            <button disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 md:col-span-4">{loading ? "Saving..." : "Add Session"}</button>
          </form>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSequenceAutoMode(true);
                setBlockIndex(suggestedSequence.blockIndex);
                setSessionIndex(suggestedSequence.sessionIndex);
              }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Use Suggested Sequence
            </button>
            <span className="text-xs text-slate-600">
              Suggested: B{suggestedSequence.blockIndex}/S{suggestedSequence.sessionIndex}. {suggestedSequence.note}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 md:grid-cols-3">
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-700">Batch:</span> Pick graduating batch like
              2029. This sets year/semester automatically.
            </p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-700">Course:</span> Only courses mapped to the
              selected batch semester and department are shown.
            </p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="font-semibold text-slate-700">Faculty:</span> Filtered to the selected
              batch department to avoid cross-department assignment.
            </p>
          </div>
          {selectedBatch ? (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Planning for Batch {selectedBatch.label} ({selectedBatch.departmentId}) · Semester {selectedBatch.semester} · Regulation {selectedBatch.regulation}. Matching options: {filteredCourses.length} courses, {filteredFaculty.length} faculty.
            </div>
          ) : null}
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <p className="font-semibold">Operational flow from Session Planning to Team Generation</p>
            <ol className="mt-1 list-decimal space-y-1 pl-4">
              <li>Create or update a session row with Batch + Course + Faculty here.</li>
              <li>In that same session row, click <span className="font-semibold">Teams</span> to open Team Generation with the same Batch/Course pre-selected.</li>
              <li>Generate teams, then click <span className="font-semibold">Assignments</span> to create one assignment per team.</li>
              <li>Open <span className="font-semibold">Role Map</span> for a session, then use <span className="font-semibold">Grades</span> to score and finalize.</li>
            </ol>
            <p className="mt-2">
              Example: If you plan <span className="font-semibold">Batch 2029 (CSE)</span> with
              <span className="font-semibold"> CS3495</span> in <span className="font-semibold">B1/S1</span>,
              click <span className="font-semibold">Teams</span> in that row and generate size-5 teams,
              then continue to <span className="font-semibold">Assignments</span> and
              <span className="font-semibold"> Role Map</span>.
            </p>
          </div>
          {(batches.length === 0 || courses.length === 0 || faculty.length === 0) ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p>Batch, course, or faculty master data is empty.</p>
              <p className="mt-1">
                Missing now: {batches.length === 0 ? "Batch " : ""}
                {courses.length === 0 ? "Course " : ""}
                {faculty.length === 0 ? "Faculty" : ""}
              </p>
              <p className="mt-1">
                Create batches at <Link href="/batches" className="font-semibold underline">/batches</Link>. Courses come from seed data. Faculty records need to be added before planning sessions.
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Block/Session</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Faculty</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">No session plans yet.</td>
                  </tr>
                ) : (
                  sortedSessions.map((s) => (
                    <tr key={s.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">B{s.blockIndex} · S{s.sessionIndex}</td>
                      <td className="px-3 py-2">{s.batch.label}</td>
                      <td className="px-3 py-2">{s.course.code} · {s.course.name}</td>
                      <td className="px-3 py-2">{s.faculty.name}</td>
                      <td className="px-3 py-2">{s.date ? dateInput(s.date) : "-"}</td>
                      <td className="px-3 py-2">{s.status}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <select value={s.status} onChange={(e) => changeSessionStatus(s.id, e.target.value as SessionStatus)} className="rounded border border-slate-300 px-2 py-1 text-xs">
                            <option value="PLANNED">PLANNED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="LOCKED">LOCKED</option>
                          </select>
                          <Link
                            href={`/cycles/${cycleId}/sessions/${s.id}/grades`}
                            className="rounded bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Grades
                          </Link>
                          <Link
                            href={`/cycles/${cycleId}/teams?batchId=${s.batchId}&courseId=${s.courseId}`}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Teams
                          </Link>
                          <Link
                            href={`/cycles/${cycleId}/assignments?batchId=${s.batchId}&courseId=${s.courseId}`}
                            className="rounded bg-violet-600 px-2 py-1 text-xs font-semibold text-white hover:bg-violet-700"
                          >
                            Assignments
                          </Link>
                          <Link
                            href={`/cycles/${cycleId}/sessions/${s.id}/role-mapping`}
                            className="rounded bg-sky-600 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-700"
                          >
                            Role Map
                          </Link>
                          <button onClick={() => deleteSession(s.id)} className="rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700">Delete</button>
                        </div>
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
