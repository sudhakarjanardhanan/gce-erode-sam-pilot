import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";

import { GradeEntryClient } from "./grade-entry-client";

type PageProps = {
  params: Promise<{ cycleId: string; sessionId: string }>;
};

export default async function SessionGradesPage({ params }: PageProps) {
  const session = await auth();
  const { cycleId, sessionId } = await params;

  if (!session?.user) {
    redirect(`/login?callbackUrl=/cycles/${cycleId}/sessions/${sessionId}/grades`);
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const allowed =
    roles.includes("ADMIN") ||
    roles.includes("HOD") ||
    roles.includes("PRINCIPAL") ||
    roles.includes("FACULTY");
  if (!allowed) {
    redirect("/");
  }

  return <GradeEntryClient cycleId={cycleId} sessionId={sessionId} />;
}
