import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";

import { BatchDetailClient } from "./batch-detail-client";

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function BatchDetailPage({ params }: PageProps) {
  const session = await auth();
  const { batchId } = await params;

  if (!session?.user) {
    redirect(`/login?callbackUrl=/batches/${batchId}`);
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const allowed = roles.includes("ADMIN") || roles.includes("HOD") || roles.includes("PRINCIPAL");

  if (!allowed) {
    redirect("/");
  }

  return <BatchDetailClient batchId={batchId} />;
}
