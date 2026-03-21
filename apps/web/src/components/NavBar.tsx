"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function NavBar() {
  const { data: session, status } = useSession();
  const roles: string[] = (session?.user?.roles as string[]) ?? [];
  const isAdmin = roles.includes("ADMIN");
  const canManageCycles = roles.includes("ADMIN") || roles.includes("HOD") || roles.includes("PRINCIPAL");

  return (
    <nav className="border-b border-slate-200 bg-white px-6 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-base font-bold text-slate-900">GCE Erode — SAM</span>
          <span className="hidden text-xs text-slate-400 sm:inline">Student Assignment Model</span>
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {session && (
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
          )}
          <Link href="/mentors/alumni" className="text-slate-600 hover:text-slate-900">
            Mentors
          </Link>
          <Link href="/reports" className="text-slate-600 hover:text-slate-900">
            Reports
          </Link>
          {canManageCycles && (
            <Link href="/cycles" className="text-slate-600 hover:text-slate-900">
              Cycles
            </Link>
          )}
          {canManageCycles && (
            <Link href="/batches" className="text-slate-600 hover:text-slate-900">
              Batches
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin/registrations" className="text-slate-600 hover:text-slate-900">
              Admin
            </Link>
          )}

          {status === "loading" ? null : session ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-500 sm:inline">
                {session.user.name ?? session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
