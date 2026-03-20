import Link from "next/link";

import { db } from "@/lib/db";

export default async function AlumniMentorsPage() {
  let mentors:
    | Array<{
        id: string;
        fullName: string;
        graduationYear: number;
        branch: string;
        organization: string | null;
        roleTitle: string | null;
        expertise: string[];
        department: { id: string; name: string } | null;
      }>
    | null = null;
  let error: string | null = null;

  try {
    mentors = await db.alumniMentor.findMany({
      where: { isActive: true },
      orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        graduationYear: true,
        branch: true,
        organization: true,
        roleTitle: true,
        expertise: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 100,
    });
  } catch {
    error = "Could not load mentor directory. Ensure database is running, migrated, and seeded.";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Alumni Mentor Directory</h1>
            <p className="mt-2 text-sm text-slate-600">Visible to faculty and students (read-only).</p>
          </div>
          <Link href="/mentors" className="text-sm font-medium text-slate-700 hover:underline">
            Back to Mentors
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {mentors && mentors.length > 0 ? (
            mentors.map((mentor) => (
              <Link
                key={mentor.id}
                href={`/mentors/alumni/${mentor.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{mentor.fullName}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {mentor.roleTitle ?? "Mentor"}
                      {mentor.organization ? ` · ${mentor.organization}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {mentor.branch} · Batch {mentor.graduationYear}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Department: {mentor.department?.name ?? mentor.branch}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mentor.expertise.slice(0, 3).map((item) => (
                    <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {item}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No active alumni mentors found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
