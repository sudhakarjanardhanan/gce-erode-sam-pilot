"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type RegistrationItem = {
  id: string;
  role: string;
  fullName: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt: string | null;
  reviewerNotes: string | null;
};

const STORAGE_KEY = "sam-admin-review-auth";

export default function AdminRegistrationsPage() {
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewToken, setReviewToken] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [requests, setRequests] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const saved = JSON.parse(raw) as { reviewerEmail?: string; reviewToken?: string };
      if (saved.reviewerEmail) {
        setReviewerEmail(saved.reviewerEmail);
      }
      if (saved.reviewToken) {
        setReviewToken(saved.reviewToken);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const baseHeaders = useMemo(() => {
    if (!reviewerEmail || !reviewToken) {
      return null;
    }

    return {
      Authorization: `Bearer ${reviewToken}`,
      "x-user-email": reviewerEmail,
      "Content-Type": "application/json",
    };
  }, [reviewToken, reviewerEmail]);

  const saveAuth = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          reviewerEmail,
          reviewToken,
        }),
      );
      setError(null);
    },
    [reviewToken, reviewerEmail],
  );

  const loadRequests = useCallback(async () => {
    if (!baseHeaders) {
      setError("Enter reviewer email and token first.");
      return;
    }

    setLoading(true);
    setError(null);

    const search = new URLSearchParams();
    if (statusFilter !== "ALL") {
      search.set("status", statusFilter);
    }

    try {
      const res = await fetch(`/api/registration?${search.toString()}`, {
        headers: baseHeaders,
      });

      const data = (await res.json()) as { error?: string; requests?: RegistrationItem[] };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load registration requests.");
      }

      setRequests(data.requests ?? []);
    } catch (loadError) {
      setRequests([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load registration requests.");
    } finally {
      setLoading(false);
    }
  }, [baseHeaders, statusFilter]);

  const updateRequest = useCallback(
    async (id: string, status: "APPROVED" | "REJECTED") => {
      if (!baseHeaders) {
        setError("Enter reviewer email and token first.");
        return;
      }

      setUpdatingId(id);
      setError(null);

      try {
        const res = await fetch(`/api/registration/${id}/review`, {
          method: "PATCH",
          headers: baseHeaders,
          body: JSON.stringify({
            status,
            reviewerNotes: status === "APPROVED" ? "Approved by admin" : "Rejected by admin",
          }),
        });

        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to update request");
        }

        await loadRequests();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Failed to update request");
      } finally {
        setUpdatingId(null);
      }
    },
    [baseHeaders, loadRequests],
  );

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-slate-900">Registration Review Console</h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin-only review queue for registration requests.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={saveAuth} className="grid gap-3 md:grid-cols-3">
            <input
              type="email"
              value={reviewerEmail}
              onChange={(event) => setReviewerEmail(event.target.value)}
              placeholder="Reviewer email"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              type="password"
              value={reviewToken}
              onChange={(event) => setReviewToken(event.target.value)}
              placeholder="Review API token"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Save Auth Context
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | "PENDING" | "APPROVED" | "REJECTED")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button
              type="button"
              onClick={loadRequests}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              {loading ? "Loading..." : "Load Requests"}
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </section>

        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No registration requests loaded.
                  </td>
                </tr>
              ) : (
                requests.map((request) => {
                  const isPending = request.status === "PENDING";
                  const isBusy = updatingId === request.id;

                  return (
                    <tr key={request.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-slate-900">{request.fullName}</td>
                      <td className="px-4 py-3 text-slate-700">{request.email}</td>
                      <td className="px-4 py-3 text-slate-700">{request.role}</td>
                      <td className="px-4 py-3 text-slate-700">{request.status}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(request.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => updateRequest(request.id, "APPROVED")}
                            disabled={!isPending || isBusy}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRequest(request.id, "REJECTED")}
                            disabled={!isPending || isBusy}
                            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}