import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL", "FACULTY"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId } = await context.params;
  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId")?.trim();
  const courseId = searchParams.get("courseId")?.trim();

  const assignments = await db.assignment.findMany({
    where: {
      cycleId,
      ...(batchId ? { batchId } : {}),
      ...(courseId ? { courseId } : {}),
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      brief: true,
      status: true,
      team: {
        select: {
          id: true,
          name: true,
          members: {
            orderBy: [{ memberIndex: "asc" }],
            select: {
              student: { select: { rollNumber: true, name: true } },
            },
          },
        },
      },
      course: { select: { code: true, name: true } },
      batch: { select: { label: true, departmentId: true } },
    },
  });

  return NextResponse.json({ assignments });
}

export async function POST(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId } = await context.params;
  const body = (await request.json()) as {
    batchId?: string;
    courseId?: string;
    resetExisting?: boolean;
  };

  const batchId = body.batchId?.trim();
  const courseId = body.courseId?.trim();
  const resetExisting = body.resetExisting !== false;

  if (!batchId || !courseId) {
    return NextResponse.json({ error: "batchId and courseId are required" }, { status: 400 });
  }

  const [course, teams] = await Promise.all([
    db.course.findUnique({
      where: { id: courseId },
      select: { code: true, name: true },
    }),
    db.team.findMany({
      where: { cycleId, batchId, courseId },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!course) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  if (teams.length === 0) {
    return NextResponse.json(
      { error: "No teams found. Generate teams before generating assignments." },
      { status: 409 },
    );
  }

  await db.$transaction(async (tx) => {
    if (resetExisting) {
      await tx.assignment.deleteMany({ where: { cycleId, batchId, courseId } });
    }

    for (let i = 0; i < teams.length; i += 1) {
      const team = teams[i];
      await tx.assignment.upsert({
        where: {
          cycleId_teamId_title: {
            cycleId,
            teamId: team.id,
            title: `${course.code} Assignment ${String(i + 1).padStart(2, "0")}`,
          },
        },
        update: {
          brief: `Team ${team.name} should prepare and present an outcome-based problem statement for ${course.code} (${course.name}).`,
          createdBy: authz.session?.user?.email ?? null,
        },
        create: {
          cycleId,
          batchId,
          courseId,
          teamId: team.id,
          title: `${course.code} Assignment ${String(i + 1).padStart(2, "0")}`,
          brief: `Team ${team.name} should prepare and present an outcome-based problem statement for ${course.code} (${course.name}).`,
          status: "GENERATED",
          createdBy: authz.session?.user?.email ?? null,
        },
      });
    }
  });

  return NextResponse.json({ ok: true, assignmentCount: teams.length });
}
