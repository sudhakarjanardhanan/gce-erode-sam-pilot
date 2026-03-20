"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const allowedRoles = new Set(["student", "faculty", "hod", "alumni"]);

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

function roleLabel(role: string): string {
  switch (role) {
    case "student":
      return "Student";
    case "faculty":
      return "Faculty";
    case "hod":
      return "HoD";
    case "alumni":
      return "Alumni Mentor";
    default:
      return "Unknown";
  }
}

export default function RoleRegistrationPage() {
  const params = useParams<{ role: string }>();
  const role = (params?.role || "").toLowerCase();

  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const isValidRole = useMemo(() => allowedRoles.has(role), [role]);

  async function handleSubmit(formData: FormData) {
    setState({ status: "submitting" });

    const payload = {
      role,
      fullName: String(formData.get("fullName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      departmentId: String(formData.get("departmentId") || "").trim() || undefined,
      departmentName: String(formData.get("departmentName") || "").trim() || undefined,
      batchYear: Number(formData.get("batchYear") || 0) || undefined,
      graduationYear: Number(formData.get("graduationYear") || 0) || undefined,
      branch: String(formData.get("branch") || "").trim() || undefined,
      organization: String(formData.get("organization") || "").trim() || undefined,
      roleTitle: String(formData.get("roleTitle") || "").trim() || undefined,
      expertise: String(formData.get("expertise") || "").trim() || undefined,
    };

    try {
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setState({ status: "error", message: result.error ?? "Could not submit registration request." });
        return;
      }

      setState({ status: "success", message: "Registration request submitted. You will be notified after review." });
    } catch {
      setState({ status: "error", message: "Network error while submitting registration request." });
    }
  }

  if (!isValidRole) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <p className="text-lg font-semibold">Invalid registration role.</p>
          <Link href="/register" className="mt-3 inline-block text-sm font-medium underline">
            Back to registration
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/register" className="text-sm font-medium text-slate-700 hover:underline">
          Back to registration
        </Link>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">{roleLabel(role)} Registration</h1>
          <p className="mt-2 text-sm text-slate-600">
            Submit your details. The administration team will review and approve access.
          </p>

          <form
            className="mt-6 grid grid-cols-1 gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit(new FormData(event.currentTarget));
            }}
          >
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Full Name</span>
              <input name="fullName" required className="rounded-lg border border-slate-300 px-3 py-2" />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Email</span>
              <input name="email" type="email" required className="rounded-lg border border-slate-300 px-3 py-2" />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-slate-800">Phone (optional)</span>
              <input name="phone" className="rounded-lg border border-slate-300 px-3 py-2" />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Department Code (optional)</span>
                <input name="departmentId" placeholder="CSE / ECE / EEE..." className="rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Department Name (optional)</span>
                <input name="departmentName" className="rounded-lg border border-slate-300 px-3 py-2" />
              </label>
            </div>

            {role === "student" ? (
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-slate-800">Batch Year</span>
                <input name="batchYear" type="number" min={2000} max={2100} className="rounded-lg border border-slate-300 px-3 py-2" />
              </label>
            ) : null}

            {role === "alumni" ? (
              <>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-800">Graduation Year</span>
                  <input name="graduationYear" type="number" min={1970} max={2100} className="rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-800">Branch</span>
                  <input name="branch" className="rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-800">Organization</span>
                  <input name="organization" className="rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-800">Role Title</span>
                  <input name="roleTitle" className="rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-slate-800">Expertise (comma separated)</span>
                  <input name="expertise" className="rounded-lg border border-slate-300 px-3 py-2" />
                </label>
              </>
            ) : null}

            <button
              type="submit"
              disabled={state.status === "submitting"}
              className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {state.status === "submitting" ? "Submitting..." : "Submit Registration"}
            </button>
          </form>

          {state.status === "success" ? (
            <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{state.message}</div>
          ) : null}

          {state.status === "error" ? (
            <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{state.message}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
