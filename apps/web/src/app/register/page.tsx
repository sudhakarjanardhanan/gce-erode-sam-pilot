import Link from "next/link";

const roles = [
  {
    key: "student",
    title: "Student Registration",
    description: "For active students to request account and profile onboarding.",
  },
  {
    key: "faculty",
    title: "Faculty Registration",
    description: "For faculty members to request operational access.",
  },
  {
    key: "hod",
    title: "HoD Registration",
    description: "For department heads requiring oversight permissions.",
  },
  {
    key: "alumni",
    title: "Alumni Mentor Registration",
    description: "For alumni to join the mentor directory for student/faculty visibility.",
  },
];

export default function RegisterLandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold text-slate-900">Registration</h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose your profile type to submit a registration request. Requests stay pending until reviewed.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Admin reviewers can process requests in the{" "}
          <Link href="/admin/registrations" className="font-medium text-slate-800 underline">
            review console
          </Link>
          .
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <Link
              key={role.key}
              href={`/register/${role.key}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-900">{role.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{role.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
