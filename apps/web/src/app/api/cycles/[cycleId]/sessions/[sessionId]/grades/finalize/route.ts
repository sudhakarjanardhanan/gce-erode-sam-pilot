import { NextResponse } from "next/server";
import { SessionRole } from "@prisma/client";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

type RouteContext = {
  params: Promise<{ cycleId: string; sessionId: string }>;
};

const CORE_ROLES: SessionRole[] = [
  SessionRole.PRESENTER,
  SessionRole.TECHNICAL_REVIEWER,
  SessionRole.FEEDBACK_STRATEGIST,
];

export async function POST(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "PRINCIPAL", "HOD", "FACULTY"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId, sessionId } = await context.params;
  const body = (await request.json()) as { role?: SessionRole };
  const role = body.role;

  if (!role || !CORE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Valid role is required for finalization" }, { status: 400 });
  }

  const session = await db.sessionPlan.findFirst({
    where: { id: sessionId, cycleId },
    select: {
      id: true,
      status: true,
      batch: {
        select: {
          id: true,
          students: { select: { id: true, rollNumber: true } },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session plan not found" }, { status: 404 });
  }

  if (session.status === "LOCKED") {
    return NextResponse.json({ error: "Session already locked" }, { status: 409 });
  }

  const students = session.batch.students;
  if (students.length === 0) {
    return NextResponse.json({ error: "Cannot finalize grades for an empty batch" }, { status: 409 });
  }

  const existingGrades = await db.gradeRecord.findMany({
    where: {
      sessionPlanId: sessionId,
      role,
      studentId: { in: students.map((s) => s.id) },
    },
    select: { studentId: true },
  });

  const gradedStudentIds = new Set(existingGrades.map((g) => g.studentId));
  const missingStudents = students.filter((s) => !gradedStudentIds.has(s.id));

  if (missingStudents.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot finalize ${role}. ${missingStudents.length} students are not graded yet.`,
        missingStudents: missingStudents.slice(0, 10).map((s) => s.rollNumber),
      },
      { status: 409 },
    );
  }

  await db.gradeRecord.updateMany({
    where: {
      sessionPlanId: sessionId,
      role,
      studentId: { in: students.map((s) => s.id) },
    },
    data: {
      status: "FINALIZED",
      gradedAt: new Date(),
      gradedBy: authz.session?.user?.email ?? null,
    },
  });

  const finalizedCount = await db.gradeRecord.count({
    where: {
      sessionPlanId: sessionId,
      role: { in: CORE_ROLES },
      status: "FINALIZED",
      studentId: { in: students.map((s) => s.id) },
    },
  });

  const expectedCount = students.length * CORE_ROLES.length;
  const allRolesFinalized = finalizedCount >= expectedCount;

  if (allRolesFinalized) {
    await db.sessionPlan.update({
      where: { id: sessionId },
      data: { status: "LOCKED" },
    });
  }

  return NextResponse.json({
    ok: true,
    role,
    allRolesFinalized,
    sessionStatus: allRolesFinalized ? "LOCKED" : session.status,
  });
}
