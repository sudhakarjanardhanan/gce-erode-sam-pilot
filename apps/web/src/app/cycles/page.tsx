import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";

import { CyclesClient } from "./cycles-client";

export default async function CyclesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/cycles");
  }

  const roles = (session.user.roles as string[] | undefined) ?? [];
  const allowed = roles.includes("ADMIN") || roles.includes("HOD") || roles.includes("PRINCIPAL");
  if (!allowed) {
    redirect("/");
  }

  const cycles = await db.academicCycle.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      academicYear: true,
      semesterLabel: true,
      startDate: true,
      endDate: true,
      status: true,
      _count: { select: { sessionPlans: true } },
    },
    take: 100,
  });

  return (
    <CyclesClient
      initialCycles={cycles}
      canActivate={roles.includes("ADMIN") || roles.includes("HOD") || roles.includes("PRINCIPAL")}
    />
  );
}
