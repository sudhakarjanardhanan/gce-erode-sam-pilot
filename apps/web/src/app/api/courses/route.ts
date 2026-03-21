import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

export async function GET(request: Request) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL", "FACULTY"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("departmentId")?.trim() || undefined;
  const semester = searchParams.get("semester") ? Number(searchParams.get("semester")) : undefined;
  const regulation = searchParams.get("regulation")?.trim() || undefined;

  const courses = await db.course.findMany({
    where: {
      ...(departmentId && { departmentId }),
      ...(semester !== undefined && !Number.isNaN(semester) && { semester }),
      ...(regulation && { regulation }),
    },
    orderBy: [{ departmentId: "asc" }, { semester: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      credits: true,
      semester: true,
      regulation: true,
      departmentId: true,
    },
    take: 1000,
  });

  return NextResponse.json({ courses });
}
