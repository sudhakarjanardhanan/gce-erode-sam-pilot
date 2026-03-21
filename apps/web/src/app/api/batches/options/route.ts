import { NextResponse } from "next/server";

import { requireSessionRoles } from "@/lib/auth/roleGuard";
import { db } from "@/lib/db";

export async function GET() {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const departments = await db.department.findMany({
    orderBy: [{ id: "asc" }],
    select: { id: true, name: true },
    take: 100,
  });

  return NextResponse.json({ departments });
}

