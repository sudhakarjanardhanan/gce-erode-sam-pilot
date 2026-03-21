import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

type RouteContext = {
  params: Promise<{ facultyId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL", "FACULTY"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { facultyId } = await context.params;

  const faculty = await db.faculty.findUnique({
    where: { id: facultyId },
    select: {
      id: true,
      staffCode: true,
      name: true,
      email: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      sessionPlans: {
        take: 30,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          blockIndex: true,
          sessionIndex: true,
          createdAt: true,
          cycle: { select: { id: true, name: true } },
          batch: { select: { id: true, label: true, year: true } },
          course: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });

  if (!faculty) {
    return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
  }

  const batches = await db.batch.findMany({
    where: { departmentId: faculty.departmentId },
    orderBy: [{ year: "desc" }, { semester: "asc" }],
    select: {
      id: true,
      label: true,
      year: true,
      semester: true,
      regulation: true,
      _count: { select: { students: true } },
    },
  });

  return NextResponse.json({ faculty, batches });
}
