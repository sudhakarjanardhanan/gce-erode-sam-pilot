import Link from "next/link";

import { db } from "@/lib/db";
import { evaluateCycleReportGate } from "@/lib/reports/cycleGate";

type PageProps = {
  params: Promise<{ cycleId: string }>;
};

function GateBadge({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Gate Open</span>
  ) : (
    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">Gate Blocked</span>
  );
}

export default async function CycleReportPage({ params }: PageProps) {
  const { cycleId } = await params;

  const [cycle, gate, latestSnapshot] = await Promise.all([
    db.academicCycle.findUnique({
      where: { id: cycleId },
      select: {
        id: true,
        name: true,
        status: true,
        academicYear: true,
        semesterLabel: true,
      },
    }),
    evaluateCycleReportGate(cycleId),
    db.reportSnapshot.findFirst({
      where: { cycleId },
      orderBy: { generatedAt: "desc" },
      select: { id: true, status: true, generatedAt: true, publishedAt: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/reports" className="text-sm font-medium text-slate-700 hover:underline">
          Back to Reports
        </Link>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{cycle?.name ?? "Unknown Cycle"}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {cycle?.semesterLabel ?? "-"} · {cycle?.academicYear ?? "-"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <GateBadge allowed={gate.allowed} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Cycle Status: {cycle?.status ?? "N/A"}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Total Sessions</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{gate.totalSessions}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Completed Sessions</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{gate.completedSessions}</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500">Remaining Sessions</div>
              <div className="mt-1 text-2xl font-semibold text-slate-900">{gate.remainingSessions}</div>
            </div>
          </div>

          {!gate.allowed ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p className="font-medium">Report generation is blocked.</p>
              <p className="mt-1">Reason: {gate.reason ?? "Unknown"}</p>
            </div>
          ) : (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-medium">Cycle satisfies report-gate predicate.</p>
              <p className="mt-1">You can generate a new report snapshot now.</p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <form action={`/api/reports/${cycleId}/generate`} method="post">
              <button
                type="submit"
                disabled={!gate.allowed}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Generate Report Snapshot
              </button>
            </form>
            <Link
              href={`/api/reports/${cycleId}/gate`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              View Gate JSON
            </Link>
            <Link
              href={`/api/reports/${cycleId}/pdf`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Download PDF
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 p-4 text-sm">
            <p className="font-medium text-slate-800">Latest Snapshot</p>
            {latestSnapshot ? (
              <div className="mt-2 space-y-1 text-slate-600">
                <p>ID: {latestSnapshot.id}</p>
                <p>Status: {latestSnapshot.status}</p>
                <p>Generated: {latestSnapshot.generatedAt.toISOString()}</p>
                <p>Published: {latestSnapshot.publishedAt ? latestSnapshot.publishedAt.toISOString() : "Not published"}</p>
              </div>
            ) : (
              <p className="mt-2 text-slate-600">No snapshot generated yet.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
