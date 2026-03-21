import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const roles: string[] = (session.user?.roles as string[]) ?? [];
  const primaryRole = roles[0] ?? "VIEWER";

  const [cycleCount, batchCount, studentCount, facultyCount, reportCount, pendingRegistrations] = await Promise.all([
    db.academicCycle.count(),
    db.batch.count(),
    db.student.count(),
    db.faculty.count(),
    db.reportSnapshot.count(),
    db.registrationRequest.count({ where: { status: "PENDING" } }),
  ]);

  const isAdmin = roles.includes("ADMIN");
  const isPrincipal = roles.includes("PRINCIPAL");
  const isHod = roles.includes("HOD");
  const isFaculty = roles.includes("FACULTY");
  const isAlumni = roles.includes("ALUMNI");

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Signed in as <span className="font-semibold text-slate-900">{session.user?.name ?? session.user?.email}</span> · Role: {primaryRole}
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Academic Cycles</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{cycleCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Batches</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{batchCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Students</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{studentCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Faculty</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{facultyCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Report Snapshots</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{reportCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pending Registrations</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingRegistrations}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick Actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {(isAdmin || isHod || isPrincipal) && (
              <Link href="/cycles" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Manage Cycles</Link>
            )}
            {(isAdmin || isHod || isPrincipal) && (
              <Link href="/batches" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Manage Batches</Link>
            )}
            {(isAdmin || isHod || isPrincipal || isFaculty) && (
              <Link href="/reports" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">View Reports</Link>
            )}
            {isAdmin && (
              <Link href="/admin/registrations" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Review Registrations</Link>
            )}
            {(isAlumni || isFaculty || isHod || isAdmin || isPrincipal) && (
              <Link href="/mentors/alumni" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Mentor Directory</Link>
            )}
            <Link href="/departments" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Departments</Link>
            {(isHod || isAdmin || isPrincipal) && (
              <Link href="/dashboard/hod" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">HoD Progress</Link>
            )}
            {(isPrincipal || isAdmin) && (
              <Link href="/dashboard/principal" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">Principal Analytics</Link>
            )}
            {(isPrincipal || isAdmin) && (
              <Link href="/dashboard/institution" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Institution Dashboard</Link>
            )}
            {isAdmin && (
              <Link href="/admin/cleanup" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Data Management</Link>
            )}
          </div>
        </section>

        {isPrincipal ? (
          <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-indigo-900">Principal View</h2>
            <p className="mt-1 text-sm text-indigo-800">
              Institution-level oversight mode: monitor academic cycle health, report readiness, and pending approval workload.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-indigo-200 bg-white p-3 text-sm text-indigo-900">
                <p className="text-xs uppercase tracking-wide text-indigo-500">Operational Coverage</p>
                <p className="mt-1 font-semibold">{cycleCount} cycles · {batchCount} batches</p>
              </div>
              <div className="rounded-lg border border-indigo-200 bg-white p-3 text-sm text-indigo-900">
                <p className="text-xs uppercase tracking-wide text-indigo-500">Population</p>
                <p className="mt-1 font-semibold">{studentCount} students · {facultyCount} faculty</p>
              </div>
              <div className="rounded-lg border border-indigo-200 bg-white p-3 text-sm text-indigo-900">
                <p className="text-xs uppercase tracking-wide text-indigo-500">Governance</p>
                <p className="mt-1 font-semibold">{pendingRegistrations} pending registrations</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
