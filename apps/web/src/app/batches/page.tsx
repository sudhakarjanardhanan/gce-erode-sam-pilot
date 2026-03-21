import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";

import { BatchesClient } from "./batches-client";

export default async function BatchesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/batches");
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const allowed = roles.includes("ADMIN") || roles.includes("HOD") || roles.includes("PRINCIPAL");
  if (!allowed) {
    redirect("/");
  }

  return <BatchesClient />;
}
