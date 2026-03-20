import Link from "next/link";

import { db } from "@/lib/db";

type PageProps = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

export default async function AlumniMentorsPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const page = Number.parseInt(sp.page ?? "1", 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const pageSize = 20;
  const skip = (safePage - 1) * pageSize;

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
  let total = 0;

  try {
    const where = {
      isActive: true,
      OR: q
        ? [
            { fullName: { contains: q, mode: "insensitive" as const } },
            { branch: { contains: q, mode: "insensitive" as const } },
            { organization: { contains: q, mode: "insensitive" as const } },
            { roleTitle: { contains: q, mode: "insensitive" as const } },
          ]
        : undefined,
    };

    const [count, items] = await Promise.all([
      db.alumniMentor.count({ where }),
      db.alumniMentor.findMany({
        where,
        orderBy: [{ graduationYear: "desc" }, { fullName: "asc" }],
        skip,
        take: pageSize,
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
      }),
    ]);

    total = count;
    mentors = items;
  } catch {
    error = "Could not load mentor directory. Ensure database is running, migrated, and seeded.";
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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

        <form className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-slate-800">Search mentors</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="Name, branch, organization, role"
              className="min-w-72 rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Apply
          </button>
        </form>

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

        {!error ? (
          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <span>
              Page {safePage} of {totalPages} · {total} mentor(s)
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/mentors/alumni?q=${encodeURIComponent(q)}&page=${Math.max(1, safePage - 1)}`}
                className={`rounded border px-3 py-1 ${safePage <= 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
              >
                Prev
              </Link>
              <Link
                href={`/mentors/alumni?q=${encodeURIComponent(q)}&page=${Math.min(totalPages, safePage + 1)}`}
                className={`rounded border px-3 py-1 ${safePage >= totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
              >
                Next
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
