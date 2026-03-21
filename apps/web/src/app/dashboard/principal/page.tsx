"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CycleSummary = {
  id: string;
  name: string;
  academicYear: string;
  semesterLabel: string;
  status: string;
  total: number;
  completed: number;
  graded: number;
  deptBreakdown: { deptId: string; total: number; completed: number }[];
};

type CumulRow = {
  deptId: string;
  totalSessions: number;
  completedSessions: number;
  totalGradeRecords: number;
  avgScore: number | null;
  maxScore: number | null;
};

export default function PrincipalDashboardPage() {
  const [tab, setTab] = useState<"current" | "cumul">("current");
  const [cycleSummaries, setCycleSummaries] = useState<CycleSummary[]>([]);
  const [cumulRows, setCumulRows] = useState<CumulRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/principal/cycle-summary").then((r) => r.json() as Promise<{ cycles?: CycleSummary[] }>),
      fetch("/api/principal/cumulative").then((r) => r.json() as Promise<{ rows?: CumulRow[] }>),
    ])
      .then(([cs, cu]) => {
        setCycleSummaries(cs.cycles ?? []);
        setCumulRows(cu.rows ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeCycles = cycleSummaries.filter((c) => c.status === "ACTIVE" || c.status === "IN_PROGRESS");
  const allCycles = cycleSummaries;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="rounded-xl bg-gradient-to-r from-indigo-900 to-indigo-700 p-5 text-white shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-xl font-extrabold">🏛️ Principal — Institution-Wide Dashboard</h1>
              <p className="mt-1 text-xs text-indigo-200">All departments · All batches · Cycle progress · Cumulative analytics</p>
            </div>
            <Link href="/dashboard"
              className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b-2 border-slate-200">
          <button
            onClick={() => setTab("current")}
            className={`px-5 py-2 text-sm font-bold transition-colors ${tab === "current"
              ? "border-b-[3px] border-[#7B1C1C] text-[#7B1C1C]"
              : "text-slate-500 hover:text-slate-700"}`}>
            🔄 Current Cycle
          </button>
          <button
            onClick={() => setTab("cumul")}
            className={`px-5 py-2 text-sm font-bold transition-colors ${tab === "cumul"
              ? "border-b-[3px] border-indigo-600 text-indigo-700"
              : "text-slate-500 hover:text-slate-700"}`}>
            📊 Cumulative
          </button>
        </div>

        {loading && (
          <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
        )}

        {/* Current Cycle Panel */}
        {!loading && tab === "current" && (
          <div className="space-y-4">
            {allCycles.length === 0 && (
              <p className="text-sm text-slate-500">No academic cycles found.</p>
            )}
            {allCycles.map((cycle) => {
              const pct = cycle.total > 0 ? Math.round((cycle.completed / cycle.total) * 100) : 0;
              const statusColor: Record<string, string> = {
                ACTIVE: "bg-green-100 text-green-700",
                DRAFT: "bg-slate-100 text-slate-600",
                LOCKED: "bg-amber-100 text-amber-700",
                COMPLETED: "bg-indigo-100 text-indigo-700",
              };
              return (
                <div key={cycle.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                    <div>
                      <span className="font-semibold text-slate-800">{cycle.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{cycle.academicYear} · {cycle.semesterLabel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusColor[cycle.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {cycle.status}
                      </span>
                      <Link href={`/cycles/${cycle.id}`}
                        className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                        Manage →
                      </Link>
                    </div>
                  </div>

                  <div className="px-5 py-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Session progress: {cycle.completed} / {cycle.total}</span>
                      <span>{pct}% complete</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-[#16a34a] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {cycle.deptBreakdown.length > 0 && (
                    <div className="overflow-x-auto px-5 pb-4">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-400">
                            <th className="py-1 pr-6">Dept</th>
                            <th className="py-1 pr-6 text-center">Sessions</th>
                            <th className="py-1 text-center">Completed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {cycle.deptBreakdown.map((d) => {
                            const dp = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
                            return (
                              <tr key={d.deptId} className="text-slate-700">
                                <td className="py-1.5 pr-6 font-medium">{d.deptId}</td>
                                <td className="py-1.5 pr-6 text-center">{d.total}</td>
                                <td className="py-1.5 text-center">
                                  {d.completed}
                                  <span className="ml-1 text-slate-400">({dp}%)</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="border-t border-slate-100 px-5 py-2">
                    <p className="text-xs text-slate-500">
                      Grading: <span className="font-semibold text-slate-700">{cycle.graded}</span> sessions with grade data.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cumulative Panel */}
        {!loading && tab === "cumul" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="font-semibold text-slate-800">📊 Cumulative Grade Summary — All Cycles</h2>
              <p className="mt-0.5 text-xs text-slate-500">Aggregated across all completed and active cycles.</p>
            </div>
            {cumulRows.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No grade data available yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-[#7B1C1C] text-left text-[0.7rem] uppercase tracking-wide text-red-100">
                      <th className="px-5 py-2">Department</th>
                      <th className="px-4 py-2 text-center">Sessions</th>
                      <th className="px-4 py-2 text-center">Completed</th>
                      <th className="px-4 py-2 text-center">Grade Records</th>
                      <th className="px-4 py-2 text-center">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cumulRows.map((row) => {
                      const pct = row.maxScore && row.avgScore !== null
                        ? Math.round((row.avgScore / row.maxScore) * 100)
                        : null;
                      return (
                        <tr key={row.deptId} className="text-slate-700 hover:bg-slate-50">
                          <td className="px-5 py-2 font-medium">{row.deptId}</td>
                          <td className="px-4 py-2 text-center">{row.totalSessions}</td>
                          <td className="px-4 py-2 text-center">{row.completedSessions}</td>
                          <td className="px-4 py-2 text-center">{row.totalGradeRecords}</td>
                          <td className="px-4 py-2 text-center">
                            {row.avgScore !== null ? (
                              <span>
                                {row.avgScore.toFixed(1)}
                                {pct !== null && (
                                  <span className="ml-1 text-slate-400">({pct}%)</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
