"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ASSIGN_TYPE_META: Record<string, { label: string; icon: string; badge: string }> = {
  presentation: { label: "Topic Presentation", icon: "🎤", badge: "bg-red-100 text-red-800" },
  mini_project: { label: "Mini Project", icon: "🔧", badge: "bg-blue-100 text-blue-800" },
  practical: { label: "Practical Exercise", icon: "⚗️", badge: "bg-green-100 text-green-800" },
  problem_solve: { label: "Problem Solving", icon: "🧮", badge: "bg-amber-100 text-amber-800" },
};

const BLOOM_BADGES: Record<number, { label: string; icon: string; cls: string }> = {
  1: { label: "Remember", icon: "🔵", cls: "bg-blue-50 text-blue-700" },
  2: { label: "Understand", icon: "🟢", cls: "bg-green-50 text-green-700" },
  3: { label: "Apply", icon: "🟡", cls: "bg-yellow-50 text-yellow-800" },
  4: { label: "Analyse", icon: "🟠", cls: "bg-orange-50 text-orange-800" },
  5: { label: "Evaluate", icon: "🔴", cls: "bg-red-50 text-red-800" },
};

type AssignmentDto = {
  id: string;
  title: string;
  brief: string | null;
  assignType: string | null;
  unit: string | null;
  bloomLevel: number | null;
  learningObjectives: string[];
  sessionSlot: number | null;
  isReserve: boolean;
  approved: boolean;
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

  // P3 controls
  const [cycleNum, setCycleNum] = useState(1);
  const [mode, setMode] = useState<"auto" | "single">("auto");
  const [singleType, setSingleType] = useState("presentation");

  // Detail expand
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadOptions() {
    const res = await fetch("/api/cycles/options", { cache: "no-store" });
    const data = (await res.json()) as OptionDto & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to load options");
    setOptions({ batches: data.batches ?? [], courses: data.courses ?? [] });
  }

  async function loadAssignments(nextBatchId = batchId, nextCourseId = courseId) {
    if (!nextBatchId || !nextCourseId) { setAssignments([]); return; }
    const res = await fetch(
      `/api/cycles/${cycleId}/assignments?batchId=${encodeURIComponent(nextBatchId)}&courseId=${encodeURIComponent(nextCourseId)}`,
      { cache: "no-store" },
    );
    const data = (await res.json()) as { error?: string; assignments?: AssignmentDto[] };
    if (!res.ok) throw new Error(data.error ?? "Failed to load assignments");
    setAssignments(data.assignments ?? []);
  }

  useEffect(() => {
    loadOptions().catch((err) => setError(err instanceof Error ? err.message : "Failed to load options"));
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
        body: JSON.stringify({ batchId, courseId, cycleNum, mode, singleType, resetExisting: true }),
      });
      const data = (await res.json()) as {
        error?: string;
        assignmentCount?: number;
        activeCount?: number;
        reserveCount?: number;
        cycleNum?: number;
        bloomRange?: Array<{ level: number; label: string }>;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate assignments");

      const parts = [
        `Cycle ${data.cycleNum ?? cycleNum}: ${data.activeCount ?? 0} active + ${data.reserveCount ?? 0} reserve assignments generated.`,
      ];
      if (data.bloomRange) {
        parts.push(`Bloom's levels: ${data.bloomRange.map((b) => `L${b.level} ${b.label}`).join(", ")}.`);
      }
      setMessage(parts.join(" "));
      await loadAssignments(batchId, courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate assignments");
    } finally {
      setLoading(false);
    }
  }

  async function approveOne(id: string) {
    try {
      await fetch(`/api/cycles/${cycleId}/assignments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", assignmentId: id }),
      });
      await loadAssignments();
    } catch { /* ignore */ }
  }

  async function approveAll() {
    try {
      await fetch(`/api/cycles/${cycleId}/assignments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_all", batchId, courseId }),
      });
      setMessage("All active assignments approved.");
      await loadAssignments();
    } catch { /* ignore */ }
  }

  async function activateReserve(id: string) {
    try {
      const res = await fetch(`/api/cycles/${cycleId}/assignments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate_reserve", assignmentId: id }),
      });
      const data = (await res.json()) as { sessionSlot?: number };
      setMessage(`Reserve activated as slot ${data.sessionSlot}.`);
      await loadAssignments();
    } catch { /* ignore */ }
  }

  // Type distribution summary
  const activeAssignments = assignments.filter((a) => !a.isReserve);
  const reserveAssignments = assignments.filter((a) => a.isReserve);
  const typeCounts: Record<string, number> = {};
  for (const a of activeAssignments) {
    const t = a.assignType ?? "other";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }

  function exportUrl(fmt: "csv" | "json") {
    return `/api/cycles/${cycleId}/assignments/export?batchId=${encodeURIComponent(batchId)}&courseId=${encodeURIComponent(courseId)}&format=${fmt}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <Link href={`/cycles/${cycleId}`} className="text-sm font-medium text-slate-700 hover:underline">Back to Cycle</Link>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">P3 Assignments</h1>
          <p className="mt-1 text-sm text-slate-600">
            Phase 3 assignment engine: 12 active + 3 reserve assignments per cycle.
            Uses syllabus units as topic pool, cycles through 4 assignment types (Presentation, Mini Project, Practical, Problem Solving),
            and maps Bloom&apos;s Taxonomy complexity levels per cycle.
          </p>
        </header>

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
        {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}

        {/* Generator Panel */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={generateAssignments}>
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
            <select value={cycleNum} onChange={(e) => setCycleNum(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value={1}>Cycle 1 (Bloom L1-3)</option>
              <option value={2}>Cycle 2 (Bloom L2-4)</option>
            </select>
            <button disabled={loading} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
              {loading ? "Generating..." : "Generate P3 Assignments"}
            </button>
          </form>

          {/* Mode toggle */}
          <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
            <span className="text-xs font-semibold text-slate-600">Mode:</span>
            <button
              type="button"
              onClick={() => setMode("auto")}
              className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all ${mode === "auto" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}
            >
              Auto-Cycle (recommended)
            </button>
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all ${mode === "single" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}
            >
              Single Type
            </button>
            {mode === "single" ? (
              <select value={singleType} onChange={(e) => setSingleType(e.target.value)} className="ml-2 rounded-lg border border-slate-300 px-2 py-1 text-xs">
                {Object.entries(ASSIGN_TYPE_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.icon} {meta.label}</option>
                ))}
              </select>
            ) : null}
          </div>

          {/* Export + Approve buttons */}
          {assignments.length > 0 && batchId && courseId ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <a href={exportUrl("csv")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" download>⬇ CSV</a>
              <a href={exportUrl("json")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" download>⬇ JSON</a>
              <button type="button" onClick={approveAll} className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                ✅ Approve All Active
              </button>
            </div>
          ) : null}
        </section>

        {/* Type Distribution Summary */}
        {activeAssignments.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Assignment Type Distribution</h2>
            <div className="flex gap-2">
              {Object.entries(typeCounts).map(([type, count]) => {
                const meta = ASSIGN_TYPE_META[type] ?? { label: type, icon: "📝", badge: "bg-slate-100 text-slate-700" };
                return (
                  <span key={type} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}>
                    {meta.icon} {meta.label}: {count}
                  </span>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Active Assignments */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Active Assignments ({activeAssignments.length})
          </h2>
          <div className="space-y-2">
            {activeAssignments.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No assignments generated yet. Generate teams first, then generate P3 assignments.
              </p>
            ) : (
              activeAssignments.map((a) => {
                const typeMeta = ASSIGN_TYPE_META[a.assignType ?? ""] ?? { label: a.assignType, icon: "📝", badge: "bg-slate-100 text-slate-700" };
                const bloomBadge = a.bloomLevel ? BLOOM_BADGES[a.bloomLevel] : null;
                const isExpanded = expandedId === a.id;
                return (
                  <div key={a.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        {a.sessionSlot ?? "—"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : a.id)}
                            className="text-left text-sm font-semibold text-slate-900 hover:text-indigo-700"
                          >
                            {a.title}
                          </button>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeMeta.badge}`}>
                            {typeMeta.icon} {typeMeta.label}
                          </span>
                          {bloomBadge ? (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${bloomBadge.cls}`}>
                              {bloomBadge.icon} L{a.bloomLevel} {bloomBadge.label}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {a.team.name} · {a.unit ?? "—"}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {a.approved ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">✅ Approved</span>
                        ) : (
                          <button type="button" onClick={() => approveOne(a.id)} className="rounded bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700 hover:bg-yellow-200">
                            ⏳ Approve
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap">
                        {a.brief}
                        {a.learningObjectives.length > 0 ? (
                          <div className="mt-3 border-t border-slate-200 pt-2">
                            <strong>Learning Objectives:</strong>
                            <ul className="mt-1 list-inside list-disc">
                              {a.learningObjectives.map((lo, i) => <li key={i}>{lo}</li>)}
                            </ul>
                          </div>
                        ) : null}
                        <div className="mt-2 text-[10px] text-slate-400">
                          Team members: {a.team.members.map((m) => `${m.student.rollNumber} ${m.student.name}`).join(" · ")}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Reserve Assignments */}
        {reserveAssignments.length > 0 ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-amber-900">
              Reserve Assignments ({reserveAssignments.length})
            </h2>
            <p className="mb-3 text-xs text-amber-700">
              Reserve assignments can be activated to replace an active assignment if needed.
            </p>
            <div className="space-y-2">
              {reserveAssignments.map((a) => {
                const typeMeta = ASSIGN_TYPE_META[a.assignType ?? ""] ?? { label: a.assignType, icon: "📝", badge: "bg-slate-100 text-slate-700" };
                const bloomBadge = a.bloomLevel ? BLOOM_BADGES[a.bloomLevel] : null;
                return (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{a.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeMeta.badge}`}>
                          {typeMeta.icon} {typeMeta.label}
                        </span>
                        {bloomBadge ? (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${bloomBadge.cls}`}>
                            {bloomBadge.icon} L{a.bloomLevel}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{a.unit ?? "—"}</div>
                    </div>
                    <button type="button" onClick={() => activateReserve(a.id)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500">
                      Activate
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
