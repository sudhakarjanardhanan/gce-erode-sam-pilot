import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";

import { RoleMappingClient } from "./role-mapping-client";

type PageProps = {
  params: Promise<{ cycleId: string; sessionId: string }>;
};

export default async function RoleMappingPage({ params }: PageProps) {
  const session = await auth();
  const { cycleId, sessionId } = await params;

  if (!session?.user) {
    redirect(`/login?callbackUrl=/cycles/${cycleId}/sessions/${sessionId}/role-mapping`);
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const allowed = roles.includes("ADMIN") || roles.includes("HOD") || roles.includes("PRINCIPAL") || roles.includes("FACULTY");
  if (!allowed) {
    redirect("/");
  }

  return <RoleMappingClient cycleId={cycleId} sessionId={sessionId} />;
}
