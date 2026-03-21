import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

export async function GET() {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL", "FACULTY"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const departments = await db.department.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      _count: {
        select: { faculty: true, batches: true },
      },
    },
  });

  return NextResponse.json({ departments });
}
