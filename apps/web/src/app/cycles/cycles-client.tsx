"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CycleItem = {
  id: string;
  name: string;
  academicYear: string;
  semesterLabel: string;
  startDate: Date;
  endDate: Date;
  status: "DRAFT" | "ACTIVE" | "LOCKED" | "COMPLETED";
  _count: { sessionPlans: number };
};

type Props = {
  initialCycles: CycleItem[];
  canActivate: boolean;
};

function toInputDate(date: Date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function CyclesClient({ initialCycles, canActivate }: Props) {
  const [cycles, setCycles] = useState(initialCycles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [semesterLabel, setSemesterLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const orderedCycles = useMemo(() => {
    return [...cycles].sort((a, b) => {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [cycles]);

  async function refreshCycles() {
    const res = await fetch("/api/cycles", { cache: "no-store" });
    const data = (await res.json()) as { error?: string; cycles?: CycleItem[] };
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load cycles");
    }
    setCycles(data.cycles ?? []);
  }

  async function createCycle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          academicYear,
          semesterLabel,
          startDate,
          endDate,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create cycle");
      }

      setName("");
      setAcademicYear("");
      setSemesterLabel("");
      setStartDate("");
      setEndDate("");

      await refreshCycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create cycle");
    } finally {
      setLoading(false);
    }
  }

  async function transition(cycleId: string, action: "ACTIVATE" | "COMPLETE") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update cycle status");
      }
      await refreshCycles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cycle status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900">Academic Cycles</h1>
          <p className="mt-2 text-sm text-slate-600">Create, activate and complete cycles. Open a cycle to manage session plans.</p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Cycle</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5" onSubmit={createCycle}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cycle name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="Academic year (e.g., 2026-27)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={semesterLabel} onChange={(e) => setSemesterLabel(e.target.value)} placeholder="Semester label" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <button disabled={loading} className="md:col-span-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{loading ? "Saving..." : "Create Cycle"}</button>
          </form>
          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Cycle</th>
                  <th className="px-3 py-2">Timeline</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Sessions</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orderedCycles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">No cycles yet.</td>
                  </tr>
                ) : (
                  orderedCycles.map((cycle) => (
                    <tr key={cycle.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{cycle.name}</div>
                        <div className="text-xs text-slate-600">{cycle.semesterLabel} · {cycle.academicYear}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{toInputDate(cycle.startDate)} to {toInputDate(cycle.endDate)}</td>
                      <td className="px-3 py-2 text-slate-700">{cycle.status}</td>
                      <td className="px-3 py-2 text-slate-700">{cycle._count.sessionPlans}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/cycles/${cycle.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link>
                          {canActivate && cycle.status === "DRAFT" ? (
                            <button onClick={() => transition(cycle.id, "ACTIVATE")} disabled={loading} className="rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Activate</button>
                          ) : null}
                          {canActivate && cycle.status === "ACTIVE" ? (
                            <button onClick={() => transition(cycle.id, "COMPLETE")} disabled={loading} className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">Complete</button>
                          ) : null}
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
