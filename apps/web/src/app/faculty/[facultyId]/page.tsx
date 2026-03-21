import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ facultyId: string }>;
};

export default async function FacultyProfilePage({ params }: Props) {
  const session = await auth();
  if (!session) { redirect("/login"); }

  const { facultyId } = await params;

  const faculty = await db.faculty.findUnique({
    where: { id: facultyId },
    select: {
      id: true,
      staffCode: true,
      name: true,
      email: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      sessionPlans: {
        take: 30,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          blockIndex: true,
          sessionIndex: true,
          createdAt: true,
          cycle: { select: { id: true, name: true } },
          batch: { select: { id: true, label: true, year: true } },
          course: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });

  if (!faculty) { notFound(); }

  const batches = await db.batch.findMany({
    where: { departmentId: faculty.departmentId },
    orderBy: [{ year: "desc" }, { semester: "asc" }],
    select: {
      id: true,
      label: true,
      year: true,
      semester: true,
      regulation: true,
      _count: { select: { students: true } },
    },
  });

  const initials = faculty.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            href={`/departments/${faculty.departmentId}`}
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            ← {faculty.department.name}
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-sm text-slate-700 font-semibold">Faculty Profile</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Profile card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 bg-gradient-to-br from-[#6366f1] to-[#4f46e5] px-5 py-5">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-xl font-extrabold text-white">
                {initials}
              </div>
              <div className="text-white">
                <div className="text-base font-extrabold leading-tight">{faculty.name}</div>
                <div className="mt-0.5 text-xs opacity-80">
                  👨‍🏫 Faculty &middot; {faculty.department.name}
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="text-xs text-slate-500 mb-1">
                <span className="font-semibold text-slate-700">Staff Code: </span>
                {faculty.staffCode}
              </div>
              {faculty.email && (
                <div className="text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">Email: </span>
                  <a href={`mailto:${faculty.email}`} className="text-indigo-600 hover:underline">
                    {faculty.email}
                  </a>
                </div>
              )}
              <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                ✅ Can manage teams, schedule sessions and grade students across all batches in this department.
              </div>
            </div>
          </div>

          {/* Batch cards */}
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">Select Batch to Manage</h3>
            <p className="mb-3 text-xs text-slate-400">
              All batches in {faculty.department.name}. Select a batch to view roster and manage courses.
            </p>
            {batches.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No batches found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {batches.map((batch, i) => {
                  const gradients = [
                    "from-[#3b82f6] to-[#6366f1]",
                    "from-[#14b8a6] to-[#059669]",
                    "from-[#f59e0b] to-[#ef4444]",
                  ];
                  const grad = gradients[i % gradients.length];
                  return (
                    <Link
                      key={batch.id}
                      href={`/batches/${batch.id}`}
                      className={`overflow-hidden rounded-xl bg-gradient-to-br ${grad} p-3 text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all`}
                    >
                      <div className="text-lg font-extrabold">{batch.year}</div>
                      <div className="text-xs opacity-80">{batch.label}</div>
                      <div className="mt-1 text-xs opacity-70">
                        Sem {batch.semester} · {batch.regulation} · {batch._count.students} students
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dashboard quick links */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h3 className="text-sm font-semibold text-slate-700">Grade Progress Dashboard</h3>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              View grading completion status for all sessions in the current batch &amp; course.
            </p>
            <Link
              href="/reports"
              className="block w-full rounded-lg bg-[#7B1C1C] px-4 py-2 text-center text-xs font-semibold text-white hover:bg-[#3D0E0E]"
            >
              📊 Open Progress Dashboard
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg">🏛️</span>
              <h3 className="text-sm font-semibold text-slate-700">Institution Dashboard</h3>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              Cross-department overview of all grades, completion rates and grade levels.
            </p>
            <Link
              href="/dashboard/institution"
              className="block w-full rounded-lg bg-[#7B1C1C] px-4 py-2 text-center text-xs font-semibold text-white hover:bg-[#3D0E0E]"
            >
              🏛️ Institution View
            </Link>
          </div>
        </div>

        {/* Scheduled Sessions table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">🗓️</span>
            <h3 className="text-sm font-semibold text-slate-700">Scheduled Sessions</h3>
          </div>
          {faculty.sessionPlans.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No sessions scheduled yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Session #</th>
                    <th className="px-3 py-2">Cycle</th>
                    <th className="px-3 py-2">Batch</th>
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.sessionPlans.map((sp) => (
                    <tr key={sp.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold">B{sp.blockIndex + 1}-S{sp.sessionIndex + 1}</td>
                      <td className="px-3 py-2">{sp.cycle.name}</td>
                      <td className="px-3 py-2">
                        <Link href={`/batches/${sp.batch.id}`} className="text-indigo-600 hover:underline">
                          {sp.batch.label} ({sp.batch.year})
                        </Link>
                      </td>
                      <td className="px-3 py-2">{sp.course.code} — {sp.course.name}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {new Date(sp.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
