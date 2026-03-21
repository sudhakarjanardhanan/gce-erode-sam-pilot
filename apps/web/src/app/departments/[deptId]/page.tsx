/**
 * Department detail page — Faculty list and Batch list for a single dept.
 * Matches reference pg-dept.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{ deptId: string }>;
};

export default async function DepartmentDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    const { deptId } = await params;
    redirect(`/login?callbackUrl=/departments/${deptId}`);
  }

  const { deptId } = await params;

  const dept = await db.department.findUnique({
    where: { id: deptId },
    select: { id: true, name: true },
  });

  if (!dept) {
    notFound();
  }

  const [faculty, batches] = await Promise.all([
    db.faculty.findMany({
      where: { departmentId: deptId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        staffCode: true,
        name: true,
        email: true,
        _count: { select: { sessionPlans: true } },
      },
    }),
    db.batch.findMany({
      where: { departmentId: deptId },
      orderBy: [{ year: "desc" }, { semester: "asc" }],
      select: {
        id: true,
        label: true,
        year: true,
        semester: true,
        regulation: true,
        _count: { select: { students: true } },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Breadcrumb + header */}
        <div className="rounded-xl bg-gradient-to-r from-[#7B1C1C] to-[#3D0E0E] p-5 text-white shadow">
          <div className="mb-1 flex items-center gap-1 text-xs text-red-300">
            <Link href="/departments" className="hover:text-white">Departments</Link>
            <span>›</span>
            <span className="text-white font-semibold">{dept.id}</span>
          </div>
          <h1 className="font-serif text-xl font-extrabold">{dept.id} — {dept.name}</h1>
          <p className="mt-1 text-xs text-red-200">{faculty.length} faculty · {batches.length} batches</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Faculty list */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Faculty</h2>
            {faculty.length === 0 && (
              <p className="text-xs text-slate-400">No faculty found.</p>
            )}
            {faculty.map((f) => (
              <Link key={f.id} href={`/faculty/${f.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#7B1C1C] hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{f.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{f.staffCode}{f.email ? ` · ${f.email}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600">
                    {f._count.sessionPlans} sessions
                  </span>
                </div>
              </Link>
            ))}
          </section>

          {/* Batch cards */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Batches</h2>
            {batches.length === 0 && (
              <p className="text-xs text-slate-400">No batches found.</p>
            )}
            {batches.map((batch) => (
              <Link
                key={batch.id}
                href={`/batches/${batch.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-[#7B1C1C] hover:shadow-md transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{batch.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Year {batch.year} · Sem {batch.semester} · {batch.regulation}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#7B1C1C]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[#7B1C1C]">
                    {batch._count.students} students
                  </span>
                </div>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
