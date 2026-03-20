import Link from "next/link";

export default function MentorsHomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold text-slate-900">Mentors</h1>
        <p className="mt-2 text-sm text-slate-600">
          Alumni mentor directory for students and faculty.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Alumni Mentor List</h2>
          <p className="mt-1 text-sm text-slate-600">
            View alumni mentors by department, graduation year, and expertise areas.
          </p>
          <div className="mt-4">
            <Link
              href="/mentors/alumni"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Open Alumni Mentor Directory
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
