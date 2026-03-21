import { NextResponse } from "next/server";
import { SessionRole } from "@prisma/client";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

type RouteContext = {
  params: Promise<{ cycleId: string; sessionId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL", "FACULTY"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId, sessionId } = await context.params;

  const session = await db.sessionPlan.findFirst({
    where: { id: sessionId, cycleId },
    select: {
      id: true,
      batch: { select: { label: true, departmentId: true } },
      course: { select: { code: true, name: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const mappings = await db.sessionRoleMapping.findMany({
    where: { sessionPlanId: sessionId },
    orderBy: [{ team: { name: "asc" } }, { role: "asc" }],
    select: {
      id: true,
      role: true,
      team: { select: { id: true, name: true } },
      student: { select: { id: true, rollNumber: true, name: true } },
      mappedBy: true,
      mappedAt: true,
    },
  });

  return NextResponse.json({ session, mappings });
}

export async function POST(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId, sessionId } = await context.params;
  const body = (await request.json()) as { resetExisting?: boolean };
  const resetExisting = body.resetExisting !== false;

  const session = await db.sessionPlan.findFirst({
    where: { id: sessionId, cycleId },
    select: {
      id: true,
      blockIndex: true,
      sessionIndex: true,
      batchId: true,
      courseId: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Get all teams for this cycle/batch/course ordered by shuffleIndex (pairing order)
  // Falls back to name asc if shuffleIndex not set (legacy teams)
  const teams = await db.team.findMany({
    where: {
      cycleId,
      batchId: session.batchId,
      courseId: session.courseId,
    },
    orderBy: [{ shuffleIndex: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      shuffleIndex: true,
      members: {
        orderBy: [{ memberIndex: "asc" }],
        select: { studentId: true },
      },
    },
  });

  if (teams.length === 0) {
    return NextResponse.json(
      { error: "No teams found for this batch/course. Generate teams first." },
      { status: 409 },
    );
  }

  if (teams.length < 3) {
    return NextResponse.json(
      { error: `Need at least 3 teams for role rotation (found ${teams.length}). Generate more teams.` },
      { status: 409 },
    );
  }

  const k = teams.length;

  // Role rotation:
  //   pairIdx = (blockIndex-1)*3 + (sessionIndex-1)
  //   Presenter team  = teams[pairIdx % k]
  //   Tech Reviewer   = teams[(pairIdx+1) % k]
  //   Feedback Strat  = teams[(pairIdx+2) % k]
  // Student representative: rotate by blockIndex so different blocks spotlight different members.
  const pairIdx = (session.blockIndex - 1) * 3 + (session.sessionIndex - 1);
  const presenterTeam = teams[pairIdx % k];
  const reviewerTeam = teams[(pairIdx + 1) % k];
  const feedbackTeam = teams[(pairIdx + 2) % k];

  const pickStudent = (team: (typeof teams)[0]) => {
    if (team.members.length === 0) return null;
    return team.members[(session.blockIndex - 1) % team.members.length].studentId;
  };

  const presenterStudentId = pickStudent(presenterTeam);
  const reviewerStudentId = pickStudent(reviewerTeam);
  const feedbackStudentId = pickStudent(feedbackTeam);

  if (!presenterStudentId || !reviewerStudentId || !feedbackStudentId) {
    return NextResponse.json({ error: "One or more teams have no members." }, { status: 409 });
  }

  const mappedBy = authz.session?.user?.email ?? null;

  await db.$transaction(async (tx) => {
    if (resetExisting) {
      await tx.sessionRoleMapping.deleteMany({ where: { sessionPlanId: sessionId } });
    }

    await tx.sessionRoleMapping.createMany({
      data: [
        {
          sessionPlanId: sessionId,
          teamId: presenterTeam.id,
          studentId: presenterStudentId,
          role: SessionRole.PRESENTER,
          mappedBy,
        },
        {
          sessionPlanId: sessionId,
          teamId: reviewerTeam.id,
          studentId: reviewerStudentId,
          role: SessionRole.TECHNICAL_REVIEWER,
          mappedBy,
        },
        {
          sessionPlanId: sessionId,
          teamId: feedbackTeam.id,
          studentId: feedbackStudentId,
          role: SessionRole.FEEDBACK_STRATEGIST,
          mappedBy,
        },
      ],
    });
  });

  return NextResponse.json({
    ok: true,
    mappingCount: 3,
    roles: {
      PRESENTER: presenterTeam.name,
      TECHNICAL_REVIEWER: reviewerTeam.name,
      FEEDBACK_STRATEGIST: feedbackTeam.name,
    },
  });
}
