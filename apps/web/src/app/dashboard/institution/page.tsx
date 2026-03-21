/**
 * Institution-Wide Grade Dashboard — pg-institution equivalent
 *
 * Shows all departments × batches × courses grade matrix.
 * Accessible to Principal and Admin.
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";

const SCALE_LABELS = [
  "🌱 Finding Your Ground",
  "⚙️ Building Momentum",
  "🔥 Gaining Confidence",
  "🚀 Leading the Room",
];

export default async function InstitutionDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/institution");
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  if (!roles.includes("ADMIN") && !roles.includes("PRINCIPAL")) {
    redirect("/dashboard");
  }

  // Load all depts with their batches, and for each batch the grade aggregates
  const departments = await db.department.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      batches: {
        orderBy: [{ year: "desc" }, { semester: "asc" }],
        select: {
          id: true,
          label: true,
          year: true,
          semester: true,
          _count: { select: { students: true } },
        },
      },
    },
  });

  // For each batch, compute grade summary grouped by course
  const gradeSummary = await Promise.all(
    departments.flatMap((dept) =>
      dept.batches.map(async (batch) => {
        const sessions = await db.sessionPlan.findMany({
          where: { batchId: batch.id },
          select: {
            id: true,
            status: true,
            course: { select: { id: true, code: true, name: true } },
            gradeRecords: {
              select: { totalScore: true, maxScore: true },
            },
          },
        });

        const byCourse = sessions.reduce<
          Record<string, {
            code: string; name: string;
            sessions: number; completed: number;
            totalScore: number; totalMax: number; gradeCount: number;
          }>
        >((acc, s) => {
          const k = s.course.id;
          if (!acc[k]) {
            acc[k] = { code: s.course.code, name: s.course.name, sessions: 0, completed: 0, totalScore: 0, totalMax: 0, gradeCount: 0 };
          }
          acc[k].sessions++;
          if (s.status === "COMPLETED") { acc[k].completed++; }
          for (const g of s.gradeRecords) {
            acc[k].totalScore += g.totalScore;
            acc[k].totalMax += g.maxScore;
            acc[k].gradeCount++;
          }
          return acc;
        }, {});

        return { deptId: dept.id, batchId: batch.id, byCourse: Object.values(byCourse) };
      }),
    ),
  );

  // Build lookup: deptId+batchId → course rows
  const gradeMap = new Map<string, typeof gradeSummary[number]["byCourse"]>();
  for (const item of gradeSummary) {
    gradeMap.set(`${item.deptId}::${item.batchId}`, item.byCourse);
  }

  // Institution-level aggregates
  const [totalStudents, totalSessions, completedSessions, totalGrades] = await Promise.all([
    db.student.count(),
    db.sessionPlan.count(),
    db.sessionPlan.count({ where: { status: "COMPLETED" } }),
    db.gradeRecord.count(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header */}
        <div className="rounded-xl bg-gradient-to-r from-[#7B1C1C] to-[#3D0E0E] p-5 text-white shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-xl font-extrabold">🏛️ Institution-Wide Grade Dashboard</h1>
              <p className="mt-1 text-xs text-red-200">All departments · All batches · All courses</p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/principal"
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
                📈 Cycle Trends
              </Link>
              <Link href="/dashboard"
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Institution stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Students", value: totalStudents.toLocaleString(), color: "border-[#7B1C1C] text-[#7B1C1C]" },
            { label: "Departments", value: departments.length.toString(), color: "border-green-600 text-green-700" },
            { label: "Sessions", value: `${completedSessions}/${totalSessions}`, color: "border-amber-500 text-amber-700" },
            { label: "Grade Records", value: totalGrades.toLocaleString(), color: "border-indigo-500 text-indigo-700" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl border-t-4 bg-white p-4 text-center shadow-sm ${stat.color}`}>
              <p className={`font-serif text-2xl font-extrabold ${stat.color.split(" ")[1]}`}>{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Scale legend */}
        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs">
          <span className="font-semibold text-slate-500 mr-1">Growth Scale:</span>
          {SCALE_LABELS.map((label, i) => (
            <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
              {i} — {label}
            </span>
          ))}
        </div>

        {/* Department × Batch × Course matrix */}
        {departments.map((dept) => (
          <div key={dept.id} className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Link href={`/departments/${dept.id}`}
                className="text-[#7B1C1C] hover:underline">
                {dept.id}
              </Link>
              <span className="font-normal text-slate-400">— {dept.name}</span>
            </h2>

            {dept.batches.length === 0 && (
              <p className="text-xs text-slate-400">No batches.</p>
            )}

            {dept.batches.map((batch) => {
              const courseRows = gradeMap.get(`${dept.id}::${batch.id}`) ?? [];
              return (
                <div key={batch.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-2">
                    <span className="text-sm font-semibold text-slate-700">{batch.label}</span>
                    <span className="text-xs text-slate-400">{batch._count.students} students · Sem {batch.semester}</span>
                  </div>

                  {courseRows.length === 0 ? (
                    <p className="px-5 py-3 text-xs text-slate-400">No sessions scheduled.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-[#7B1C1C] text-left text-[0.68rem] uppercase tracking-wide text-red-100">
                            <th className="px-4 py-2">Course</th>
                            <th className="px-3 py-2 text-center">Sessions</th>
                            <th className="px-3 py-2 text-center">Done</th>
                            <th className="px-3 py-2 text-center">Grades</th>
                            <th className="px-3 py-2 text-center">Avg / Max</th>
                            <th className="px-3 py-2 text-center">% Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {courseRows.map((c) => {
                            const avg = c.gradeCount > 0 ? c.totalScore / c.gradeCount : null;
                            const maxPossible = c.gradeCount > 0 ? c.totalMax / c.gradeCount : null;
                            const pct = avg !== null && maxPossible ? Math.round((avg / maxPossible) * 100) : null;
                            return (
                              <tr key={c.code} className="text-slate-700 hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium">
                                  {c.code}
                                  <span className="ml-1 font-normal text-slate-400">— {c.name}</span>
                                </td>
                                <td className="px-3 py-2 text-center">{c.sessions}</td>
                                <td className="px-3 py-2 text-center">
                                  {c.sessions > 0 ? (
                                    <span className={c.completed === c.sessions ? "font-semibold text-green-700" : "text-slate-600"}>
                                      {c.completed}
                                    </span>
                                  ) : "—"}
                                </td>
                                <td className="px-3 py-2 text-center">{c.gradeCount}</td>
                                <td className="px-3 py-2 text-center">
                                  {avg !== null ? `${avg.toFixed(1)} / ${(maxPossible ?? 0).toFixed(0)}` : "—"}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {pct !== null ? (
                                    <span className={`font-semibold ${pct >= 75 ? "text-green-700" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                                      {pct}%
                                    </span>
                                  ) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
