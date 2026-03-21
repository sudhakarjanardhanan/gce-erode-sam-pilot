import { NextResponse } from "next/server";
import { SessionRole } from "@prisma/client";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

type RouteContext = {
  params: Promise<{ cycleId: string; sessionId: string }>;
};

type RubricDimension = { name?: string; desc?: string; anchor?: string };

// Reference SCALE_LABELS: 4-level competency scale (scores 0–3)
export const SCALE_LABELS = [
  "🌱 Finding Your Ground",
  "⚙️ Building Momentum",
  "🔥 Gaining Confidence",
  "🚀 Leading the Room",
] as const;

export const SCORE_MAX = 3; // max per-dimension score (inclusive)

// Role-based total mark ceilings matching the reference RUBRICS.maxMarks
const ROLE_MAX_MARKS: Record<SessionRole, number> = {
  [SessionRole.PRESENTER]: 40,
  [SessionRole.TECHNICAL_REVIEWER]: 30,
  [SessionRole.FEEDBACK_STRATEGIST]: 30,
};

type DimensionMeta = { name: string; desc?: string; anchor?: string };

type ScoreMap = Record<string, number>;

function normalizeDimensions(value: unknown): DimensionMeta[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((d) => {
      if (typeof d === "string") {
        const name = d.trim();
        return name ? { name } : null;
      }
      if (d && typeof d === "object" && "name" in d) {
        const name = String((d as RubricDimension).name ?? "").trim();
        if (!name) {
          return null;
        }
        const desc = String((d as RubricDimension).desc ?? "").trim();
        const anchor = String((d as RubricDimension).anchor ?? "").trim();
        return {
          name,
          desc: desc || undefined,
          anchor: anchor || undefined,
        };
      }
      return null;
    });

  return normalized.filter((d): d is DimensionMeta => d !== null);
}

function normalizeScores(input: unknown, dimensions: DimensionMeta[]): ScoreMap | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const scoreMap: ScoreMap = {};

  for (const dim of dimensions) {
    const value = Number(raw[dim.name]);
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0 || value > SCORE_MAX) {
      return null;
    }
    scoreMap[dim.name] = value;
  }

  return scoreMap;
}

export async function GET(_request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "PRINCIPAL", "HOD", "FACULTY"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId, sessionId } = await context.params;

  const [session, rubrics] = await Promise.all([
    db.sessionPlan.findFirst({
      where: { id: sessionId, cycleId },
      select: {
        id: true,
        status: true,
        cycleId: true,
        batch: {
          select: {
            id: true,
            label: true,
            departmentId: true,
            students: {
              orderBy: [{ rollNumber: "asc" }],
              select: { id: true, rollNumber: true, name: true },
            },
          },
        },
        course: { select: { code: true, name: true } },
      },
    }),
    db.rubric.findMany({
      where: { isActive: true, role: { in: [SessionRole.PRESENTER, SessionRole.TECHNICAL_REVIEWER, SessionRole.FEEDBACK_STRATEGIST] } },
      orderBy: [{ role: "asc" }, { version: "desc" }],
      select: { id: true, role: true, name: true, dimensions: true },
    }),
  ]);

  if (!session) {
    return NextResponse.json({ error: "Session plan not found" }, { status: 404 });
  }

  const roleBestRubric = new Map<SessionRole, { id: string; role: SessionRole; name: string; dimensions: unknown }>();
  for (const rubric of rubrics) {
    if (!roleBestRubric.has(rubric.role)) {
      roleBestRubric.set(rubric.role, rubric);
    }
  }

  const gradeRecords = await db.gradeRecord.findMany({
    where: { sessionPlanId: sessionId },
    select: {
      id: true,
      studentId: true,
      role: true,
      dimensionScores: true,
      totalScore: true,
      maxScore: true,
      status: true,
      gradedAt: true,
    },
    orderBy: [{ role: "asc" }, { studentId: "asc" }],
  });

  return NextResponse.json({
    session,
    scaleLabels: SCALE_LABELS,
    scoreMax: SCORE_MAX,
    rubrics: Array.from(roleBestRubric.values()).map((r) => ({
      id: r.id,
      role: r.role,
      name: r.name,
      maxMarks: ROLE_MAX_MARKS[r.role],
      dimensions: normalizeDimensions(r.dimensions),
    })),
    gradeRecords,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "PRINCIPAL", "HOD", "FACULTY"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId, sessionId } = await context.params;
  const body = (await request.json()) as {
    studentId?: string;
    role?: SessionRole;
    dimensionScores?: unknown;
  };

  const studentId = body.studentId?.trim();
  const role = body.role;

  if (!studentId || !role) {
    return NextResponse.json({ error: "studentId and role are required" }, { status: 400 });
  }

  const [session, student, rubric] = await Promise.all([
    db.sessionPlan.findFirst({
      where: { id: sessionId, cycleId },
      select: { id: true, batchId: true, status: true },
    }),
    db.student.findUnique({
      where: { id: studentId },
      select: { id: true, batchId: true },
    }),
    db.rubric.findFirst({
      where: { role, isActive: true },
      orderBy: [{ version: "desc" }],
      select: { dimensions: true },
    }),
  ]);

  if (!session) {
    return NextResponse.json({ error: "Session plan not found" }, { status: 404 });
  }

  if (session.status === "LOCKED") {
    return NextResponse.json({ error: "Session is locked; grades cannot be edited" }, { status: 409 });
  }

  if (!student || student.batchId !== session.batchId) {
    return NextResponse.json({ error: "Student does not belong to this session batch" }, { status: 400 });
  }

  if (!rubric) {
    return NextResponse.json({ error: `No active rubric found for role ${role}` }, { status: 409 });
  }

  const dimensions = normalizeDimensions(rubric.dimensions);
  if (dimensions.length === 0) {
    return NextResponse.json({ error: `Rubric for role ${role} has no dimensions` }, { status: 409 });
  }

  const scoreMap = normalizeScores(body.dimensionScores, dimensions);
  if (!scoreMap) {
    return NextResponse.json({ error: `dimensionScores must include integer scores (0-${SCORE_MAX}) for all rubric dimensions` }, { status: 400 });
  }

  // Compute weighted total: proportional sum scaled to role maxMarks
  const rawSum = Object.values(scoreMap).reduce((sum, n) => sum + n, 0);
  const maxRaw = dimensions.length * SCORE_MAX;
  const maxScore = ROLE_MAX_MARKS[role];
  const totalScore = maxRaw > 0 ? Math.round((rawSum / maxRaw) * maxScore) : 0;

  const grade = await db.gradeRecord.upsert({
    where: {
      sessionPlanId_studentId_role: {
        sessionPlanId: sessionId,
        studentId,
        role,
      },
    },
    update: {
      dimensionScores: scoreMap,
      totalScore,
      maxScore,
      status: "DRAFT",
      gradedAt: new Date(),
      gradedBy: authz.session?.user?.email ?? null,
    },
    create: {
      sessionPlanId: sessionId,
      studentId,
      role,
      dimensionScores: scoreMap,
      totalScore,
      maxScore,
      status: "DRAFT",
      gradedAt: new Date(),
      gradedBy: authz.session?.user?.email ?? null,
    },
    select: {
      id: true,
      studentId: true,
      role: true,
      totalScore: true,
      maxScore: true,
      status: true,
      gradedAt: true,
    },
  });

  return NextResponse.json({ grade });
}
