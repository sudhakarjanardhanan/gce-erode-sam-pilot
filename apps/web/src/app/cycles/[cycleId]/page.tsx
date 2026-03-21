import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";

import { CycleDetailClient } from "./cycle-detail-client";

type PageProps = {
  params: Promise<{ cycleId: string }>;
};

export default async function CycleDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    const { cycleId } = await params;
    redirect(`/login?callbackUrl=/cycles/${cycleId}`);
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const allowed = roles.includes("ADMIN") || roles.includes("HOD") || roles.includes("PRINCIPAL");
  if (!allowed) {
    redirect("/");
  }

  const { cycleId } = await params;

  return <CycleDetailClient cycleId={cycleId} />;
}
