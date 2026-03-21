"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Mapping = {
  id: string;
  role: "PRESENTER" | "TECHNICAL_REVIEWER" | "FEEDBACK_STRATEGIST";
  team: { id: string; name: string };
  student: { id: string; rollNumber: string; name: string };
};

type SessionDto = {
  id: string;
  batch: { label: string; departmentId: string };
  course: { code: string; name: string };
};

const ROLE_LABEL: Record<Mapping["role"], string> = {
  PRESENTER: "Presenter",
  TECHNICAL_REVIEWER: "Technical Reviewer",
  FEEDBACK_STRATEGIST: "Feedback Strategist",
};

export function RoleMappingClient({ cycleId, sessionId }: { cycleId: string; sessionId: string }) {
  const [session, setSession] = useState<SessionDto | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/sessions/${sessionId}/role-mappings`, { cache: "no-store" });
      const data = (await res.json()) as { error?: string; session?: SessionDto; mappings?: Mapping[] };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load role mappings");
      }
      setSession(data.session ?? null);
      setMappings(data.mappings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load role mappings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, sessionId]);

  async function generateRoleMappings() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/sessions/${sessionId}/role-mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetExisting: true }),
      });
      const data = (await res.json()) as { error?: string; mappingCount?: number; roles?: Record<string, string> };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate role mappings");
      }

      const roleLabels = data.roles
        ? `🎤 ${data.roles.PRESENTER} · 🔍 ${data.roles.TECHNICAL_REVIEWER} · 💬 ${data.roles.FEEDBACK_STRATEGIST}`
        : "";
      setMessage(`Role mapping complete. ${roleLabels}`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate role mappings");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <Link href={`/cycles/${cycleId}`} className="text-sm font-medium text-slate-700 hover:underline">Back to Cycle</Link>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Session Role Mapping</h1>
          <p className="mt-1 text-sm text-slate-600">
            Roles are derived from the team rotation: the Presenter, Tech Reviewer, and Feedback Strategist teams are determined by this session&apos;s Block and Session index. One representative student per team is designated based on block rotation.
          </p>
          {session ? (
            <p className="mt-1 text-sm text-slate-600">
              Session {session.id} · {session.batch.label} · {session.course.code}
            </p>
          ) : null}
        </header>

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
        {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <button
            onClick={generateRoleMappings}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {loading ? "Computing..." : "Assign Roles from Team Rotation"}
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Student</th>
                </tr>
              </thead>
              <tbody>
                {mappings.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-slate-500">No role mappings generated yet.</td>
                  </tr>
                ) : (
                  mappings.map((m) => (
                    <tr key={m.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-semibold text-slate-900">{m.team.name}</td>
                      <td className="px-3 py-2">{ROLE_LABEL[m.role]}</td>
                      <td className="px-3 py-2">{m.student.rollNumber} · {m.student.name}</td>
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
