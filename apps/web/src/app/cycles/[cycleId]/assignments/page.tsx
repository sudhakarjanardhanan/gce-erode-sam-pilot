import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";

import { AssignmentsClient } from "./assignments-client";

type PageProps = {
  params: Promise<{ cycleId: string }>;
  searchParams: Promise<{ batchId?: string; courseId?: string }>;
};

export default async function AssignmentsPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const { cycleId } = await params;
  const query = await searchParams;

  if (!session?.user) {
    redirect(`/login?callbackUrl=/cycles/${cycleId}/assignments`);
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const allowed = roles.includes("ADMIN") || roles.includes("HOD") || roles.includes("PRINCIPAL") || roles.includes("FACULTY");
  if (!allowed) {
    redirect("/");
  }

  return (
    <AssignmentsClient
      cycleId={cycleId}
      initialBatchId={query.batchId?.trim() ?? ""}
      initialCourseId={query.courseId?.trim() ?? ""}
    />
  );
}
