import Link from "next/link";

import { db } from "@/lib/db";

export default async function ReportsIndexPage() {
  let cycles:
    | Array<{
        id: string;
        name: string;
        academicYear: string;
        semesterLabel: string;
        status: string;
      }>
    | null = null;
  let error: string | null = null;

  try {
    cycles = await db.academicCycle.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        academicYear: true,
        semesterLabel: true,
        status: true,
      },
      take: 20,
    });
  } catch {
    error = "Could not load cycles. Ensure database is running and migrated.";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select a cycle to view report-gate status and generate a report snapshot.
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
        ) : null}

        <div className="mt-6 space-y-3">
          {cycles && cycles.length > 0 ? (
            cycles.map((cycle) => (
              <Link
                key={cycle.id}
                href={`/reports/${cycle.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-slate-900">{cycle.name}</div>
                    <div className="text-sm text-slate-600">
                      {cycle.semesterLabel} · {cycle.academicYear}
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{cycle.status}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No cycles found yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
