"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Batch = {
  id: string;
  label: string;
  year: number;
  semester: number;
  regulation: string;
  departmentId: string;
  department: { name: string };
  _count: { students: number; sessionPlans: number };
};

type Student = {
  id: string;
  rollNumber: string;
  name: string;
  email: string | null;
  gender: string | null;
  batchId: string;
};

const PAGE_SIZE = 25;

type Props = {
  batchId: string;
};

export function BatchDetailClient({ batchId }: Props) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rollNumber, setRollNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");

  // Filter / search state
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | "M" | "F" | "OTHER">("");
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [batchRes, studentRes] = await Promise.all([
        fetch(`/api/batches/${batchId}`, { cache: "no-store" }),
        fetch(`/api/batches/${batchId}/students`, { cache: "no-store" }),
      ]);

      const batchData = (await batchRes.json()) as { error?: string; batch?: Batch };
      const studentData = (await studentRes.json()) as { error?: string; students?: Student[] };

      if (!batchRes.ok) {
        throw new Error(batchData.error ?? "Failed to load batch");
      }
      if (!studentRes.ok) {
        throw new Error(studentData.error ?? "Failed to load students");
      }

      setBatch(batchData.batch ?? null);
      setStudents(studentData.students ?? []);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batch details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/batches/${batchId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber, name, email: email || undefined, gender: gender || undefined }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to add student");
      }

      setRollNumber("");
      setName("");
      setEmail("");
      setGender("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setLoading(false);
    }
  }

  async function removeStudent(studentId: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/batches/${batchId}/students/${studentId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete student");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete student");
    } finally {
      setLoading(false);
    }
  }

  // Derived: filtered + paginated
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const textMatch = !q || s.rollNumber.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
      const gMatch = !genderFilter || (s.gender ?? "OTHER") === genderFilter;
      return textMatch && gMatch;
    });
  }, [students, search, genderFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Gender summary
  const genderCounts = useMemo(() => {
    const map: Record<string, number> = { M: 0, F: 0, OTHER: 0 };
    students.forEach((s) => {
      const g = s.gender?.toUpperCase() ?? "OTHER";
      if (g === "M" || g === "F") { map[g]++; } else { map.OTHER++; }
    });
    return map;
  }, [students]);

  function exportCsv() {
    const rows = [["Roll Number", "Name", "Gender", "Email"]];
    filtered.forEach((s) => rows.push([s.rollNumber, s.name, s.gender ?? "", s.email ?? ""]));
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batch?.label ?? batchId}-students.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function genderBadge(g: string | null) {
    const val = g?.toUpperCase();
    if (val === "M") return <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">M</span>;
    if (val === "F") return <span className="rounded bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-700">F</span>;
    return <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">—</span>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/batches" className="text-sm font-medium text-slate-700 hover:underline">Back to Batches</Link>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Batch Detail</h1>
            {batch ? (
              <p className="mt-1 text-sm text-slate-600">{batch.departmentId} · {batch.label} · {batch.year} Sem {batch.semester} · {batch.regulation}</p>
            ) : null}
          </div>
          <button onClick={load} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Refresh</button>
        </header>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

        {/* Gender summary bar */}
        {students.length > 0 && (
          <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs text-slate-600 shadow-sm">
            <span>👥 Total: <strong>{students.length}</strong></span>
            <span>♂ Male: <strong>{genderCounts.M}</strong></span>
            <span>♀ Female: <strong>{genderCounts.F}</strong></span>
            {genderCounts.OTHER > 0 && <span>Other/Unknown: <strong>{genderCounts.OTHER}</strong></span>}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add Student</h2>
          <form className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5" onSubmit={addStudent}>
            <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="Roll Number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student Name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Gender (opt)</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{loading ? "Saving..." : "Add Student"}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Toolbar */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search roll / name…"
              className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <select
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value as "" | "M" | "F" | "OTHER"); setPage(1); }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            >
              <option value="">All genders</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="OTHER">Other/Unknown</option>
            </select>
            <span className="ml-auto text-xs text-slate-500">{filtered.length} student{filtered.length !== 1 ? "s" : ""}</span>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              ⬇ CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Roll Number</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Gender</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      {students.length === 0 ? "No students in this batch yet." : "No students match the current filter."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((student, idx) => (
                    <tr key={student.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 text-slate-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{student.rollNumber}</td>
                      <td className="px-3 py-2">{student.name}</td>
                      <td className="px-3 py-2">{genderBadge(student.gender)}</td>
                      <td className="px-3 py-2 text-slate-500">{student.email ?? "—"}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeStudent(student.id)} className="rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">← Prev</button>
              <span className="text-slate-600">Page {page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40">Next →</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
