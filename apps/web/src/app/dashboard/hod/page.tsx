import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export default async function HoDDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/hod");
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  if (!roles.includes("HOD") && !roles.includes("ADMIN") && !roles.includes("PRINCIPAL")) {
    redirect("/dashboard");
  }

  // Resolve the HOD's assigned department (if exactly HOD — not Admin/Principal)
  const userEmail = session.user.email as string | undefined;
  let filterDeptId: string | null = null;
  if (roles.includes("HOD") && !roles.includes("ADMIN") && !roles.includes("PRINCIPAL")) {
    const user = await db.user.findUnique({
      where: { email: userEmail ?? "" },
      select: {
        roleAssignments: {
          where: { role: "HOD" },
          select: { departmentId: true },
          take: 1,
        },
      },
    });
    filterDeptId = user?.roleAssignments[0]?.departmentId ?? null;
  }

  // Load departments
  const departments = await db.department.findMany({
    where: filterDeptId ? { id: filterDeptId } : undefined,
    orderBy: { id: "asc" },
    select: { id: true, name: true },
  });

  // For each dept, get its batches and session progress
  const deptData = await Promise.all(
    departments.map(async (dept) => {
      const batches = await db.batch.findMany({
        where: { departmentId: dept.id },
        orderBy: [{ year: "desc" }, { semester: "asc" }],
        select: { id: true, label: true, year: true, semester: true, _count: { select: { students: true } } },
      });

      const batchRows = await Promise.all(
        batches.map(async (batch) => {
          const sessions = await db.sessionPlan.findMany({
            where: { batchId: batch.id },
            select: {
              id: true,
              status: true,
              cycleId: true,
              course: { select: { code: true, name: true } },
              cycle: { select: { id: true, name: true, status: true } },
              _count: { select: { gradeRecords: true } },
            },
            orderBy: [{ blockIndex: "asc" }, { sessionIndex: "asc" }],
          });

          const total = sessions.length;
          const completed = sessions.filter((s) => s.status === "COMPLETED").length;
          const graded = sessions.filter((s) => s._count.gradeRecords > 0).length;
          const inProgress = sessions.filter((s) => s.status === "IN_PROGRESS").length;

          // Group by course for detail view
          const byCourse = sessions.reduce<Record<string, { code: string; name: string; scheduled: number; completed: number; graded: number }>>((acc, s) => {
            const key = s.course.code;
            if (!acc[key]) {
              acc[key] = { code: s.course.code, name: s.course.name, scheduled: 0, completed: 0, graded: 0 };
            }
            acc[key].scheduled++;
            if (s.status === "COMPLETED") { acc[key].completed++; }
            if (s._count.gradeRecords > 0) { acc[key].graded++; }
            return acc;
          }, {});

          return { batch, total, completed, inProgress, graded, byCourse: Object.values(byCourse) };
        }),
      );

      return { dept, batchRows };
    }),
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* Header */}
        <div className="rounded-xl bg-gradient-to-r from-[#7B1C1C] to-[#3D0E0E] p-5 text-white shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-xl font-extrabold">🏢 Head of Department — Progress Dashboard</h1>
              <p className="mt-1 text-xs text-red-200">Session progress · Grading status · Batch summary</p>
            </div>
            <Link href="/dashboard"
              className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
              ← Dashboard
            </Link>
          </div>
        </div>

        {deptData.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No department data found. {filterDeptId ? "Your HoD role may not have a department assigned." : ""}
          </div>
        )}

        {deptData.map(({ dept, batchRows }) => (
          <div key={dept.id} className="space-y-4">
            <h2 className="text-base font-bold text-slate-800">
              {dept.id} — {dept.name}
            </h2>

            {batchRows.length === 0 && (
              <p className="text-xs text-slate-500">No batches found for this department.</p>
            )}

            {batchRows.map(({ batch, total, completed, inProgress, graded, byCourse }) => {
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div key={batch.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  {/* Batch header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{batch.label}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        Year {batch.year} · Sem {batch.semester} · {batch._count.students} students
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Progress</p>
                        <p className="text-sm font-bold text-[#7B1C1C]">{completed}/{total} sessions ({pct}%)</p>
                      </div>
                      {inProgress > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {inProgress} in progress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="px-5 py-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-[#16a34a] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Course breakdown */}
                  {byCourse.length > 0 && (
                    <div className="overflow-x-auto px-5 pb-4">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-left text-[0.7rem] uppercase tracking-wide text-slate-400">
                            <th className="py-1 pr-4">Course</th>
                            <th className="py-1 pr-4 text-center">Scheduled</th>
                            <th className="py-1 pr-4 text-center">Completed</th>
                            <th className="py-1 pr-4 text-center">Graded sessions</th>
                            <th className="py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {byCourse.map((c) => (
                            <tr key={c.code} className="text-slate-700">
                              <td className="py-1.5 pr-4 font-medium">{c.code} <span className="text-slate-400 font-normal">— {c.name}</span></td>
                              <td className="py-1.5 pr-4 text-center">{c.scheduled}</td>
                              <td className="py-1.5 pr-4 text-center">{c.completed}</td>
                              <td className="py-1.5 pr-4 text-center">{c.graded}</td>
                              <td className="py-1.5">
                                {c.completed === c.scheduled && c.scheduled > 0 ? (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[0.65rem] font-semibold text-green-700">Done</span>
                                ) : c.completed > 0 ? (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">In Progress</span>
                                ) : (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500">Pending</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {total === 0 && (
                    <p className="px-5 pb-4 text-xs text-slate-400">No sessions scheduled yet.</p>
                  )}

                  {/* Grade completion summary */}
                  {total > 0 && (
                    <div className="border-t border-slate-100 px-5 py-2">
                      <p className="text-xs text-slate-500">
                        Grading: <span className="font-semibold text-slate-700">{graded} of {total}</span> sessions have at least one grade record.
                      </p>
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
