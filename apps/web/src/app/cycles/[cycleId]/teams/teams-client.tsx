"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type TeamDto = {
  id: string;
  name: string;
  batch: { label: string; departmentId: string };
  course: { code: string; name: string };
  members: Array<{
    memberIndex: number;
    student: { id: string; rollNumber: string; name: string };
  }>;
};

type OptionDto = {
  batches: Array<{ id: string; label: string; semester: number; departmentId: string }>;
  courses: Array<{ id: string; code: string; name: string; semester: number; departmentId: string }>;
};

async function readJsonBody<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

type PairingBlock = {
  block: number;
  sessions: Array<{ session: number; P: string; TR: string; FP: string }>;
};

type TeamsClientProps = {
  cycleId: string;
  initialBatchId?: string;
  initialCourseId?: string;
};

export function TeamsClient({ cycleId, initialBatchId = "", initialCourseId = "" }: TeamsClientProps) {
  const [options, setOptions] = useState<OptionDto>({ batches: [], courses: [] });
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [pairings, setPairings] = useState<PairingBlock[]>([]);
  const [batchId, setBatchId] = useState(initialBatchId);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [teamSize, setTeamSize] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadOptions() {
    const res = await fetch("/api/cycles/options", { cache: "no-store" });
    const data = await readJsonBody<OptionDto & { error?: string }>(res);
    if (!res.ok) {
      throw new Error(data?.error ?? `Failed to load options (HTTP ${res.status})`);
    }
    if (!data) {
      throw new Error(`Empty server response while loading options (HTTP ${res.status})`);
    }
    setOptions({ batches: data.batches ?? [], courses: data.courses ?? [] });
  }

  async function loadTeams(nextBatchId = batchId, nextCourseId = courseId) {
    if (!nextBatchId || !nextCourseId) {
      setTeams([]);
      return;
    }

    const res = await fetch(`/api/cycles/${cycleId}/teams?batchId=${encodeURIComponent(nextBatchId)}&courseId=${encodeURIComponent(nextCourseId)}`, {
      cache: "no-store",
    });
    const data = await readJsonBody<{ error?: string; teams?: TeamDto[] }>(res);
    if (!res.ok) {
      throw new Error(data?.error ?? `Failed to load teams (HTTP ${res.status})`);
    }
    if (!data) {
      throw new Error(`Empty server response while loading teams (HTTP ${res.status})`);
    }
    setTeams(data.teams ?? []);
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
    loadTeams().catch((err) => setError(err instanceof Error ? err.message : "Failed to load teams"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId, courseId]);

  async function generateTeams(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/cycles/${cycleId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, courseId, teamSize, resetExisting: true }),
      });
      const data = await readJsonBody<{ error?: string; teamCount?: number; assignmentCount?: number; studentCount?: number; t5?: number; t4?: number; message?: string; warning?: string; pairings?: PairingBlock[] }>(res);
      if (!res.ok) {
        throw new Error(data?.error ?? `Failed to generate teams (HTTP ${res.status})`);
      }
      if (!data) {
        throw new Error(`Empty server response while generating teams (HTTP ${res.status})`);
      }

      const parts: string[] = [`Generated ${data.teamCount ?? 0} teams for ${data.studentCount ?? 0} students.`];
      if ((data.t5 ?? 0) > 0) parts.push(`${data.t5} team(s) of 5, ${data.t4 ?? 0} team(s) of 4.`);
      parts.push(`${data.assignmentCount ?? data.teamCount ?? 0} assignments auto-created.`);
      if (data.message) parts.push(data.message);
      if (data.warning) parts.push(`⚠️ ${data.warning}`);
      setMessage(parts.join(" "));
      if (data.pairings) setPairings(data.pairings);
      await loadTeams(batchId, courseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate teams");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <Link href={`/cycles/${cycleId}`} className="text-sm font-medium text-slate-700 hover:underline">Back to Cycle</Link>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Team Generation</h1>
          <p className="mt-1 text-sm text-slate-600">Teams are formed in sizes of 4 or 5. The count is automatically snapped to a multiple of 3 so every team rotates through Presenter, Tech Reviewer, and Feedback Provider roles exactly once per round.</p>
        </header>

        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
        {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={generateTeams}>
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
            <input type="number" min={2} max={8} value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} placeholder="Preferred size (4)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" title="Preferred team size hint (2–8). Actual sizes will be 4 or 5; count snapped to ÷3." required />
            <button disabled={loading} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
              {loading ? "Generating..." : "Generate Teams"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Members</th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-8 text-center text-slate-500">No teams generated yet.</td>
                  </tr>
                ) : (
                  teams.map((team) => (
                    <tr key={team.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-semibold text-slate-900">{team.name}</td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          {team.members.map((m) => (
                            <div key={m.student.id} className="text-xs text-slate-700">
                              #{m.memberIndex} · {m.student.rollNumber} · {m.student.name}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {pairings.length > 0 ? (
          <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-indigo-900">Pre-computed Role Rotation</h2>
            <p className="mb-3 text-xs text-indigo-700">
              Each session block has 3 sessions. One team presents, one reviews technically, and one gives feedback.
              Roles rotate so every team plays all three roles across the full cycle.
              When you create session plans (Block / Session indices), the role mapping for each session is derived automatically from this table.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-indigo-100 text-indigo-800">
                  <tr>
                    <th className="px-3 py-2">Block</th>
                    <th className="px-3 py-2">Session</th>
                    <th className="px-3 py-2">🎤 Presenter</th>
                    <th className="px-3 py-2">🔍 Tech Reviewer</th>
                    <th className="px-3 py-2">💬 Feedback Strategist</th>
                  </tr>
                </thead>
                <tbody>
                  {pairings.flatMap((block) =>
                    block.sessions.map((s, si) => (
                      <tr key={`${block.block}-${s.session}`} className="border-t border-indigo-200">
                        {si === 0 ? (
                          <td className="px-3 py-2 font-semibold text-indigo-900" rowSpan={block.sessions.length}>
                            Block {block.block}
                          </td>
                        ) : null}
                        <td className="px-3 py-2 text-indigo-700">S{s.session}</td>
                        <td className="px-3 py-2 font-medium text-emerald-700">{s.P}</td>
                        <td className="px-3 py-2 font-medium text-blue-700">{s.TR}</td>
                        <td className="px-3 py-2 font-medium text-violet-700">{s.FP}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
