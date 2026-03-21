"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AssignmentDto = {
  id: string;
  title: string;
  brief: string | null;
  status: string;
  team: {
    id: string;
    name: string;
    members: Array<{ student: { rollNumber: string; name: string } }>;
  };
};

type OptionDto = {
  batches: Array<{ id: string; label: string; semester: number; departmentId: string }>;
  courses: Array<{ id: string; code: string; name: string; semester: number; departmentId: string }>;
};

type AssignmentsClientProps = {
  cycleId: string;
  initialBatchId?: string;
  initialCourseId?: string;
};

export function AssignmentsClient({ cycleId, initialBatchId = "", initialCourseId = "" }: AssignmentsClientProps) {
  const [options, setOptions] = useState<OptionDto>({ batches: [], courses: [] });
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [batchId, setBatchId] = useState(initialBatchId);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadOptions() {
    const res = await fetch("/api/cycles/options", { cache: "no-store" });
    const data = (await res.json()) as OptionDto & { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load options");
    }
    setOptions({ batches: data.batches ?? [], courses: data.courses ?? [] });
  }

  async function loadAssignments(nextBatchId = batchId, nextCourseId = courseId) {
    if (!nextBatchId || !nextCourseId) {
      setAssignments([]);
      return;
    }

    const res = await fetch(`/api/cycles/${cycleId}/assignments?batchId=${encodeURIComponent(nextBatchId)}&courseId=${encodeURIComponent(nextCourseId)}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as { error?: string; assignments?: AssignmentDto[] };
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load assignments");
    }
    setAssignments(data.assignments ?? []);
  }

  useEffect(() => {
    (async () => {
      try {
        await loadOptions();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load options");
      }
    })();
  }, []);

  useEffect(() => {
    loadAssignments().catch((err) => setError(err instanceof Error ? err.message : "Failed to load assignments"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, courseId]);

  async function generateAssignments(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, courseId, resetExisting: true }),
      });
      const data = (await res.json()) as { error?: string; assignmentCount?: number };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate assignments");
      }

      setMessage(`Generated ${data.assignmentCount ?? 0} assignments.`);
      await loadAssignments(batchId, courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate assignments");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <Link href={`/cycles/${cycleId}`} className="text-sm font-medium text-slate-700 hover:underline">Back to Cycle</Link>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Assignments</h1>
          <p className="mt-1 text-sm text-slate-600">
            Assignments are <strong>auto-created when teams are generated</strong> — one per team, linked to the team.
            Use the selector below to view them. The &ldquo;Regenerate&rdquo; button resets and re-creates assignments from the current teams (use only if teams were changed after initial generation).
          </p>
        </header>

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
        {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={generateAssignments}>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
              <option value="">Select batch</option>
              {options.batches.map((b) => (
                <option key={b.id} value={b.id}>{b.label} · Sem {b.semester} · {b.departmentId}</option>
              ))}
            </select>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
              <option value="">Select course</option>
              {options.courses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
              ))}
            </select>
            <button disabled={loading} className="rounded-lg border border-amber-500 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60">
              {loading ? "Regenerating..." : "Regenerate from Teams"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Brief</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                      No assignments found. Generate teams first — assignments are created automatically.
                    </td>
                  </tr>
                ) : (
                  assignments.map((a) => (
                    <tr key={a.id} className="border-t border-slate-200 align-top">
                      <td className="px-3 py-2 font-semibold text-slate-900">{a.title}</td>
                      <td className="px-3 py-2">
                        <div className="text-xs font-semibold text-slate-800">{a.team.name}</div>
                        <div className="mt-1 space-y-1 text-xs text-slate-600">
                          {a.team.members.map((m, idx) => (
                            <div key={idx}>{m.student.rollNumber} · {m.student.name}</div>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">{a.brief ?? "-"}</td>
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
