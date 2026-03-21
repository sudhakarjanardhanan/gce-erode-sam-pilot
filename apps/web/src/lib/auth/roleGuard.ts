import { auth } from "@/lib/auth/auth";

export async function requireSessionRoles(allowedRoles: string[]) {
  const session = await auth();

  if (!session?.user) {
    return { ok: false as const, reason: "UNAUTHENTICATED" as const };
  }

  const userRoles = (session.user.roles as string[] | undefined) ?? [];
  const hasRole = userRoles.some((role) => allowedRoles.includes(role));

  if (!hasRole) {
    return { ok: false as const, reason: "FORBIDDEN" as const };
  }

  return {
    ok: true as const,
    session,
  };
}
