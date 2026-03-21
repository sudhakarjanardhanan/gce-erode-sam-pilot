"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Department = {
  id: string;
  name: string;
};

type Batch = {
  id: string;
  label: string;
  year: number;
  semester: number;
  regulation: string;
  departmentId: string;
  department: { name: string };
  _count: { students: number };
};

export function BatchesClient() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [departmentId, setDepartmentId] = useState("");
  const [label, setLabel] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [semester, setSemester] = useState<number>(1);
  const [regulation, setRegulation] = useState("R2021");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedBatches = useMemo(() => {
    return [...batches].sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }
      if (a.semester !== b.semester) {
        return a.semester - b.semester;
      }
      return a.label.localeCompare(b.label);
    });
  }, [batches]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [deptRes, batchRes] = await Promise.all([
        fetch("/api/batches/options", { cache: "no-store" }),
        fetch("/api/batches", { cache: "no-store" }),
      ]);

      const deptData = (await deptRes.json()) as { error?: string; departments?: Department[] };
      const batchData = (await batchRes.json()) as { error?: string; batches?: Batch[] };

      if (!deptRes.ok) {
        throw new Error(deptData.error ?? "Failed to load departments");
      }
      if (!batchRes.ok) {
        throw new Error(batchData.error ?? "Failed to load batches");
      }

      setDepartments(deptData.departments ?? []);
      setBatches(batchData.batches ?? []);
      if (!departmentId && deptData.departments && deptData.departments.length > 0) {
        setDepartmentId(deptData.departments[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createBatch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          year,
          semester,
          regulation,
          departmentId,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create batch");
      }

      setLabel("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create batch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900">Batch Management</h1>
          <p className="mt-2 text-sm text-slate-600">Create and maintain department batches. Open a batch to manage students.</p>
        </header>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Batch</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5" onSubmit={createBatch}>
            <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Batch label (e.g., CSE-A)" required />
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" min={2000} max={2100} required />
            <input type="number" value={semester} onChange={(e) => setSemester(Number(e.target.value))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" min={1} max={8} required />
            <input value={regulation} onChange={(e) => setRegulation(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Regulation" required />
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.id} · {d.name}</option>
              ))}
            </select>
            <button disabled={loading} className="md:col-span-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{loading ? "Saving..." : "Create Batch"}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Department</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Year/Sem</th>
                  <th className="px-3 py-2">Regulation</th>
                  <th className="px-3 py-2">Students</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">No batches found.</td>
                  </tr>
                ) : (
                  sortedBatches.map((b) => (
                    <tr key={b.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{b.departmentId}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{b.label}</div>
                        <div className="text-xs text-slate-600">{b.department.name}</div>
                      </td>
                      <td className="px-3 py-2">{b.year} · Sem {b.semester}</td>
                      <td className="px-3 py-2">{b.regulation}</td>
                      <td className="px-3 py-2">{b._count.students}</td>
                      <td className="px-3 py-2">
                        <Link href={`/batches/${b.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Open</Link>
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
