/**
 * Department listing page — entry point for Dept → Faculty → Batch navigation.
 * Matches reference pg-home dept card grid.
 */
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";

const DEPT_ICONS: Record<string, string> = {
  CSE: "💻",
  ECE: "📡",
  EEE: "⚡",
  MCE: "⚙️",
  CVE: "🏗️",
  ATE: "🚗",
  IMT: "🖥️",
  DSC: "📊",
};

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/departments");
  }

  const departments = await db.department.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      _count: {
        select: { faculty: true, batches: true },
      },
    },
  });

  // Student counts per dept via batches
  const studentCounts = await db.student.groupBy({
    by: ["batchId"],
    _count: { id: true },
  });

  const batchDepts = await db.batch.findMany({
    select: { id: true, departmentId: true },
  });

  const batchToDept = new Map(batchDepts.map((b) => [b.id, b.departmentId]));
  const deptStudentCount = new Map<string, number>();
  for (const row of studentCounts) {
    const deptId = batchToDept.get(row.batchId);
    if (deptId) {
      deptStudentCount.set(deptId, (deptStudentCount.get(deptId) ?? 0) + row._count.id);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-gradient-to-r from-[#7B1C1C] to-[#3D0E0E] p-5 text-white shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-serif text-xl font-extrabold">🎓 Select Department</h1>
              <p className="mt-1 text-xs text-red-200">Department → Faculty → Batch → Course</p>
            </div>
            <Link href="/dashboard"
              className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
              ← Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {departments.map((dept) => {
            const icon = DEPT_ICONS[dept.id] ?? "🏫";
            const students = deptStudentCount.get(dept.id) ?? 0;
            return (
              <Link
                key={dept.id}
                href={`/departments/${dept.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition hover:border-[#7B1C1C] hover:shadow-md">
                <div className="text-3xl mb-2">{icon}</div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#7B1C1C]">{dept.id}</div>
                <div className="mt-1 text-xs text-slate-600 leading-tight">{dept.name}</div>
                <div className="mt-2 text-[0.68rem] text-slate-400">
                  👥 {students} students · {dept._count.faculty} faculty
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
