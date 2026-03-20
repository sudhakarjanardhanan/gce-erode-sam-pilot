import Link from "next/link";

const sections = [
  {
    title: "Registration",
    description: "Students, faculty, HoDs and alumni can submit a registration request to join the platform.",
    href: "/register",
    label: "Register",
    accent: "bg-blue-600 hover:bg-blue-700",
  },
  {
    title: "Alumni Mentor Directory",
    description: "Browse alumni mentors by department, graduation year, and area of expertise.",
    href: "/mentors/alumni",
    label: "View Mentors",
    accent: "bg-teal-600 hover:bg-teal-700",
  },
  {
    title: "Academic Reports",
    description: "View and generate student progress reports for completed academic cycles.",
    href: "/reports",
    label: "View Reports",
    accent: "bg-violet-600 hover:bg-violet-700",
  },
  {
    title: "Admin — Registration Review",
    description: "Review and approve or reject pending registration requests. Admin access required.",
    href: "/admin/registrations",
    label: "Open Console",
    accent: "bg-slate-700 hover:bg-slate-800",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            GCE Erode — SAM
          </h1>
          <span className="text-sm text-slate-500">Student Assignment Model</span>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-slate-200 bg-white px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Pilot</p>
          <h2 className="mt-2 text-4xl font-bold text-slate-900">
            Welcome to the SAM Platform
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            A unified platform for managing student assignments, session-based assessments,
            faculty reviews, and alumni mentoring at GCE Erode.
          </p>
        </div>
      </section>

      {/* Navigation cards */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h3 className="mb-6 text-sm font-semibold uppercase tracking-widest text-slate-500">
            Quick Access
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((s) => (
              <div
                key={s.href}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div>
                  <h4 className="text-base font-semibold text-slate-900">{s.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.description}</p>
                </div>
                <div className="mt-6">
                  <Link
                    href={s.href}
                    className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${s.accent}`}
                  >
                    {s.label} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status note */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-800">
          <strong>Pilot build:</strong> Database-backed features (reports, mentor list, admin review) require
          the local PostgreSQL instance to be running. Run{" "}
          <code className="rounded bg-amber-100 px-1 font-mono">docker compose up -d</code> inside{" "}
          <code className="rounded bg-amber-100 px-1 font-mono">apps/web/</code> to start it.
        </div>
      </section>
    </main>
  );
}
