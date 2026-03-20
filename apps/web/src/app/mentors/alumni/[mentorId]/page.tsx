import Link from "next/link";

import { db } from "@/lib/db";

type PageProps = {
  params: Promise<{ mentorId: string }>;
};

export default async function AlumniMentorProfilePage({ params }: PageProps) {
  const { mentorId } = await params;

  const mentor = await db.alumniMentor.findUnique({
    where: { id: mentorId },
    select: {
      id: true,
      fullName: true,
      graduationYear: true,
      branch: true,
      organization: true,
      roleTitle: true,
      expertise: true,
      profileSummary: true,
      email: true,
      linkedInUrl: true,
      isActive: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!mentor || !mentor.isActive) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <p className="text-lg font-semibold">Mentor not found.</p>
          <Link href="/mentors/alumni" className="mt-3 inline-block text-sm font-medium underline">
            Back to directory
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/mentors/alumni" className="text-sm font-medium text-slate-700 hover:underline">
          Back to directory
        </Link>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">{mentor.fullName}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {mentor.roleTitle ?? "Mentor"}
            {mentor.organization ? ` · ${mentor.organization}` : ""}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Graduation</p>
              <p className="text-sm font-medium text-slate-900">{mentor.branch} · {mentor.graduationYear}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Department</p>
              <p className="text-sm font-medium text-slate-900">{mentor.department?.name ?? mentor.branch}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-slate-500">Expertise</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {mentor.expertise.map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                  {item}
                </span>
              ))}
            </div>
          </div>

          {mentor.profileSummary ? (
            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Profile Summary</p>
              <p className="mt-1 text-sm text-slate-700">{mentor.profileSummary}</p>
            </div>
          ) : null}

          <div className="mt-4 space-y-1 text-sm text-slate-700">
            {mentor.email ? <p>Email: {mentor.email}</p> : null}
            {mentor.linkedInUrl ? (
              <p>
                LinkedIn: <a className="text-slate-900 underline" href={mentor.linkedInUrl}>{mentor.linkedInUrl}</a>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
