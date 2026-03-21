"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Cycle = { id: string; name: string; status: string };
type Dept = { id: string; name: string };
type Batch = { id: string; label: string; departmentId: string; year: number };
type Course = { id: string; code: string; name: string; departmentId: string };
type Summary = { cycles: number; sessions: number; teams: number; pairings: number; grades: number };

export default function AdminCleanupPage() {
  // Scope pickers for targeted operations
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [selCycleId, setSelCycleId] = useState("");
  const [selDeptId, setSelDeptId] = useState("");
  const [selBatchId, setSelBatchId] = useState("");
  const [selCourseId, setSelCourseId] = useState("");

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  // Confirm state â€” nuclear actions use a different required phrase
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("DELETE");

  const loadAll = useCallback(() => {
    void fetch("/api/cycles")
      .then((r) => r.json())
      .then((d: { cycles?: Cycle[] }) => setCycles(d.cycles ?? []));
    void fetch("/api/departments")
      .then((r) => r.json())
      .then((d: { departments?: Dept[] }) => setDepts(d.departments ?? []));
    void fetch("/api/batches")
      .then((r) => r.json())
      .then((d: { batches?: Batch[] }) => setBatches(d.batches ?? []));
    void fetch("/api/courses")
      .then((r) => r.json())
      .then((d: { courses?: Course[] }) => setCourses(d.courses ?? []));
    void fetch("/api/admin/cleanup")
      .then((r) => r.json())
      .then((d: Summary) => setSummary(d));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredBatches = batches.filter(
    (b) => !selDeptId || b.departmentId === selDeptId,
  );
  const filteredCourses = courses.filter(
    (c) => !selDeptId || c.departmentId === selDeptId,
  );

  const runAction = useCallback(
    async (action: string, params?: Record<string, string>) => {
      setBusy(true);
      setResult(null);
      setIsError(false);
      try {
        const qs = new URLSearchParams({ action, ...params });
        const res = await fetch(`/api/admin/cleanup?${qs.toString()}`, {
          method: "DELETE",
        });
        const data = (await res.json()) as { deleted?: number; error?: string };
        if (!res.ok) {
          setIsError(true);
          setResult(data.error ?? "Operation failed");
        } else {
          setResult(`âœ… Done â€” ${data.deleted ?? 0} record(s) deleted.`);
          // Refresh summary after destructive action
          void fetch("/api/admin/cleanup").then((r) => r.json()).then((d: Summary) => setSummary(d));
        }
      } catch {
        setIsError(true);
        setResult("Network error");
      } finally {
        setBusy(false);
        setPendingAction(null);
        setConfirmText("");
      }
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    if (!pendingAction || confirmText.toUpperCase() !== confirmPhrase) { return; }
    const [action, ...rest] = pendingAction.split("|");
    const params: Record<string, string> = {};
    rest.forEach((kv) => {
      const [k, v] = kv.split("=");
      if (k && v) { params[k] = v; }
    });
    void runAction(action, params);
  }, [pendingAction, confirmText, confirmPhrase, runAction]);

  const confirmAndRun = (action: string, phrase = "DELETE", params?: Record<string, string>) => {
    const actionString = params
      ? `${action}|${Object.entries(params).map(([k, v]) => `${k}=${v}`).join("|")}`
      : action;
    setPendingAction(actionString);
    setConfirmPhrase(phrase);
    setConfirmText("");
    setResult(null);
  };

  const scopeParamsOk = !!selCycleId && !!selBatchId && !!selCourseId;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="rounded-xl bg-gradient-to-r from-[#7B1C1C] to-[#3D0E0E] p-5 text-white shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold">âš™ï¸ Data Management</h1>
              <p className="mt-1 text-xs text-red-200">
                Principal / Admin Role Only Â· All destructive operations are irreversible
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadAll} className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
                ðŸ”„ Refresh
              </button>
              <Link href="/dashboard"
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
                â† Home
              </Link>
            </div>
          </div>
        </div>

        {/* System Summary bar */}
        {summary && (
          <div className="flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm text-xs text-slate-600">
            <span>ðŸ“… <strong>{summary.cycles}</strong> cycles</span>
            <span>ðŸ—“ï¸ <strong>{summary.sessions}</strong> sessions</span>
            <span>ðŸ‘¥ <strong>{summary.teams}</strong> teams</span>
            <span>ðŸ”— <strong>{summary.pairings}</strong> pairings</span>
            <span>ðŸ… <strong>{summary.grades}</strong> grade records</span>
          </div>
        )}

        {/* Toast */}
        {result && (
          <div className={`rounded-lg border p-3 text-sm font-medium ${isError
            ? "border-red-300 bg-red-50 text-red-800"
            : "border-green-300 bg-green-50 text-green-800"}`}>
            {result}
          </div>
        )}

        {/* Confirm modal */}
        {pendingAction && (
          <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4 shadow-lg">
            <p className="mb-2 text-sm font-bold text-red-800">
              âš ï¸ Confirm destructive action
            </p>
            <p className="mb-3 text-xs text-red-700">
              Type <strong className="font-mono">{confirmPhrase}</strong> below to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmPhrase}
              className="mb-3 w-full rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-mono"
            />
            <div className="flex gap-2">
              <button
                disabled={confirmText.toUpperCase() !== confirmPhrase || busy}
                onClick={handleConfirm}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                {busy ? "Runningâ€¦" : "Confirm Delete"}
              </button>
              <button
                onClick={() => { setPendingAction(null); setConfirmText(""); }}
                className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Shared scope selectors (Zones 1â€“4) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Scope Selectors (for per-course operations)</p>
          <div className="flex flex-wrap gap-2">
            <select value={selDeptId} onChange={(e) => { setSelDeptId(e.target.value); setSelBatchId(""); setSelCourseId(""); }}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">
              <option value="">â€” Dept â€”</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.id} â€” {d.name}</option>)}
            </select>
            <select value={selBatchId} onChange={(e) => setSelBatchId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">
              <option value="">â€” Batch â€”</option>
              {filteredBatches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <select value={selCycleId} onChange={(e) => setSelCycleId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">
              <option value="">â€” Cycle â€”</option>
              {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={selCourseId} onChange={(e) => setSelCourseId(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">
              <option value="">â€” Course â€”</option>
              {filteredCourses.map((c) => <option key={c.id} value={c.id}>{c.code} â€” {c.name}</option>)}
            </select>
          </div>
          {scopeParamsOk && (
            <p className="mt-2 text-xs text-emerald-700">âœ“ Scope selected â€” per-course operations enabled.</p>
          )}
        </div>

        {/* â”€â”€ ZONE 1: Cycle Management â”€â”€ */}
        <section className="overflow-hidden rounded-xl border-2 border-[#C9A84C]">
          <div className="flex items-center justify-between bg-[#C9A84C] px-5 py-3">
            <span className="font-bold text-[#2C2416]">ðŸ”„ Zone 1 â€” Cycle Management</span>
            <span className="rounded bg-[#2C2416] px-2 py-0.5 text-xs font-bold text-[#C9A84C]">LOW RISK</span>
          </div>
          <div className="space-y-3 bg-amber-50 p-5">
            <p className="text-xs text-amber-800">Delete all cycle metadata. Static data (departments, batches, faculty, courses) is always preserved.</p>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy || !!pendingAction}
                onClick={() => confirmAndRun("delete-all-cycles")}
                className="rounded-lg border border-amber-600 bg-white px-4 py-2 text-xs font-semibold text-amber-800 disabled:opacity-40">
                ðŸ—‘ï¸ Delete ALL Cycles
              </button>
            </div>
          </div>
        </section>

        {/* â”€â”€ ZONE 2: Session & Schedule Cleanup â”€â”€ */}
        <section className="overflow-hidden rounded-xl border-2 border-[#7B1C1C]">
          <div className="flex items-center justify-between bg-[#7B1C1C] px-5 py-3">
            <span className="font-bold text-white">ðŸ“… Zone 2 â€” Session &amp; Schedule Cleanup</span>
            <span className="rounded bg-white px-2 py-0.5 text-xs font-bold text-[#7B1C1C]">HIGH RISK</span>
          </div>
          <div className="space-y-3 bg-red-50 p-5">
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!scopeParamsOk || busy || !!pendingAction}
                onClick={() => confirmAndRun("clear-sessions", "DELETE", { cycleId: selCycleId, batchId: selBatchId, courseId: selCourseId })}
                className="rounded-lg border border-[#7B1C1C] bg-white px-4 py-2 text-xs font-semibold text-[#7B1C1C] disabled:opacity-40">
                ðŸ—‘ï¸ Clear Schedule (selected course)
              </button>
              <button
                disabled={busy || !!pendingAction}
                onClick={() => confirmAndRun("clear-all-sessions")}
                className="rounded-lg bg-[#7B1C1C] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                âš ï¸ Clear ALL Schedules
              </button>
              <button
                disabled={busy || !!pendingAction}
                onClick={() => confirmAndRun("clear-all-grades")}
                className="rounded-lg bg-[#7B1C1C] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                âš ï¸ Clear ALL Grades
              </button>
            </div>
          </div>
        </section>

        {/* â”€â”€ ZONE 3: Team & Pairing Cleanup â”€â”€ */}
        <section className="overflow-hidden rounded-xl border-2 border-[#2D6A4F]">
          <div className="flex items-center justify-between bg-[#2D6A4F] px-5 py-3">
            <span className="font-bold text-white">ðŸ‘¥ Zone 3 â€” Team &amp; Pairing Cleanup</span>
            <span className="rounded bg-white px-2 py-0.5 text-xs font-bold text-[#2D6A4F]">MEDIUM RISK</span>
          </div>
          <div className="space-y-3 bg-green-50 p-5">
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!scopeParamsOk || busy || !!pendingAction}
                onClick={() => confirmAndRun("clear-teams", "DELETE", { cycleId: selCycleId, batchId: selBatchId, courseId: selCourseId })}
                className="rounded-lg border border-[#2D6A4F] bg-white px-4 py-2 text-xs font-semibold text-[#2D6A4F] disabled:opacity-40">
                ðŸ—‘ï¸ Clear Teams (selected course)
              </button>
              <button
                disabled={busy || !!pendingAction}
                onClick={() => confirmAndRun("clear-all-teams")}
                className="rounded-lg bg-[#2D6A4F] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                âš ï¸ Clear ALL Teams
              </button>
              <button
                disabled={busy || !!pendingAction}
                onClick={() => confirmAndRun("clear-all-pairings")}
                className="rounded-lg bg-[#2D6A4F] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                âš ï¸ Clear ALL Pairings
              </button>
            </div>
            <p className="text-xs text-green-800">Clearing teams also removes all team members and assignments for those teams.</p>
          </div>
        </section>

        {/* â”€â”€ ZONE 4: Nuclear Options â”€â”€ */}
        <section className="overflow-hidden rounded-xl border-2 border-red-600">
          <div className="flex items-center justify-between bg-red-600 px-5 py-3">
            <span className="font-bold text-white">â˜¢ï¸ Zone 4 â€” Nuclear Options</span>
            <span className="rounded bg-white px-2 py-0.5 text-xs font-bold text-red-600">CRITICAL RISK</span>
          </div>
          <div className="bg-red-50 p-5 space-y-4">
            <p className="text-xs text-red-800 font-semibold">
              âš ï¸ These operations are <strong>permanent and irreversible</strong>.
              Static data (departments, batches, faculty, syllabus) is always preserved.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Reset Course */}
              <div className="rounded-lg border border-red-300 bg-white p-4">
                <p className="text-xs font-bold text-[#7B1C1C] mb-1">ðŸ” Reset Course Data</p>
                <p className="text-xs text-slate-500 mb-3">
                  Wipe teams + pairings + schedule + grades for the selected Dept/Batch/Cycle/Course combo.
                </p>
                <button
                  disabled={!scopeParamsOk || busy || !!pendingAction}
                  onClick={() => confirmAndRun("reset-course", "DELETE", { cycleId: selCycleId, batchId: selBatchId, courseId: selCourseId })}
                  className="w-full rounded-lg bg-[#7B1C1C] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                  Reset Course
                </button>
              </div>
              {/* Wipe All */}
              <div className="rounded-lg border-2 border-red-600 bg-white p-4">
                <p className="text-xs font-extrabold text-red-600 mb-1">💥 WIPE ALL DATA</p>
                <p className="text-xs text-slate-500 mb-2">
                  Deletes <em>everything</em>: all cycles, teams, pairings, assignments, schedule, grades.
                </p>
                <p className="text-xs text-red-600 font-semibold mb-3">
                  Use scope selectors above then type{" "}
                  <code className="rounded bg-red-100 px-1 font-mono">DELETE ALL DATA</code> to unlock.
                </p>
                <button
                  disabled={busy || !!pendingAction}
                  onClick={() => confirmAndRun("wipe-all-data", "DELETE ALL DATA")}
                  className="w-full rounded-lg bg-red-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-40">
                  💥 WIPE ALL DATA
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
