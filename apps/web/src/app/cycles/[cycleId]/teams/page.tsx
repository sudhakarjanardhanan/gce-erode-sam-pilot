import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";

import { TeamsClient } from "./teams-client";

type PageProps = {
  params: Promise<{ cycleId: string }>;
  searchParams: Promise<{ batchId?: string; courseId?: string }>;
};

export default async function TeamsPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const { cycleId } = await params;
  const query = await searchParams;

  if (!session?.user) {
    redirect(`/login?callbackUrl=/cycles/${cycleId}/teams`);
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const allowed = roles.includes("ADMIN") || roles.includes("HOD") || roles.includes("PRINCIPAL") || roles.includes("FACULTY");
  if (!allowed) {
    redirect("/");
  }

  return (
    <TeamsClient
      cycleId={cycleId}
      initialBatchId={query.batchId?.trim() ?? ""}
      initialCourseId={query.courseId?.trim() ?? ""}
    />
  );
}
