"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  batchId: string;
};

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batch details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
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
        body: JSON.stringify({ rollNumber, name, email: email || undefined }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to add student");
      }

      setRollNumber("");
      setName("");
      setEmail("");
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add Student</h2>
          <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={addStudent}>
            <input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="Roll Number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student Name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">{loading ? "Saving..." : "Add Student"}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Roll Number</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-500">No students in this batch yet.</td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{student.rollNumber}</td>
                      <td className="px-3 py-2">{student.name}</td>
                      <td className="px-3 py-2">{student.email ?? "-"}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeStudent(student.id)} className="rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700">Delete</button>
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
