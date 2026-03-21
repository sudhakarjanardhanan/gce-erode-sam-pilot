import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

/**
 * Compute k (number of teams) from student count and preferred team size.
 * Teams are allowed to be size 4 or 5 only (matching reference platform).
 * Constraint: t5 = n - 4k >= 0  AND  t4 = 5k - n >= 0  i.e.  n/5 <= k <= n/4
 */
function computeK(n: number, preferredSize: number): number {
  let k = Math.max(1, Math.round(n / preferredSize));
  while (n - 4 * k < 0 && k > 1) k--;
  while (5 * k - n < 0) k++;
  return k;
}

/**
 * Snap k to nearest multiple of 3 (required for role-rotation: every team
 * plays Presenter, Tech Reviewer, Feedback Provider exactly once per round).
 * Prefers snapping down (slightly larger teams); falls back to snapping up.
 * Returns { k, adjusted } — if snap is impossible (tiny batch), returns original k.
 */
function snapKToMultipleOf3(
  rawK: number,
  n: number,
): { k: number; adjusted: boolean } {
  if (rawK % 3 === 0) return { k: rawK, adjusted: false };

  const kDown = rawK - (rawK % 3);
  const kUp = rawK + (3 - (rawK % 3));

  if (kDown >= 1) {
    const t5 = n - 4 * kDown;
    const t4 = 5 * kDown - n;
    if (t5 >= 0 && t4 >= 0) return { k: kDown, adjusted: true };
  }
  if (kUp >= 1) {
    const t5 = n - 4 * kUp;
    const t4 = 5 * kUp - n;
    if (t5 >= 0 && t4 >= 0) return { k: kUp, adjusted: true };
  }

  return { k: rawK, adjusted: false }; // edge case: cannot snap
}

/**
 * Build k team chunks from a sorted student array.
 * First t5 = (n - 4k) teams get 5 students each; remaining t4 = (5k - n) teams
 * get 4 students each.  Total = 5*t5 + 4*t4 = 5(n-4k) + 4(5k-n) = n ✓
 */
function buildTeamChunks<T>(students: T[], k: number): T[][] {
  const n = students.length;
  const t5 = n - 4 * k;
  const chunks: T[][] = [];
  let idx = 0;
  for (let i = 0; i < k; i++) {
    const size = i < t5 ? 5 : 4;
    chunks.push(students.slice(idx, idx + size));
    idx += size;
  }
  return chunks;
}

function toApiError(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return {
      status: 500,
      message:
        "Database schema is out of date (required table is missing). Run: npm --prefix apps/web run prisma:migrate:deploy",
    };
  }

  return {
    status: 500,
    message: error instanceof Error ? error.message : fallback,
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
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

    const teams = await db.team.findMany({
      where: {
        cycleId,
        ...(batchId ? { batchId } : {}),
        ...(courseId ? { courseId } : {}),
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        batchId: true,
        courseId: true,
        batch: { select: { label: true, departmentId: true } },
        course: { select: { code: true, name: true } },
        members: {
          orderBy: [{ memberIndex: "asc" }],
          select: {
            memberIndex: true,
            student: { select: { id: true, rollNumber: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    const apiError = toApiError(error, "Failed to load teams");
    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.status },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
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
      teamSize?: number;
      resetExisting?: boolean;
    };

    const batchId = body.batchId?.trim();
    const courseId = body.courseId?.trim();
    // teamSize is a preferred hint (default 4, matching reference platform); actual
    // team sizes will be 4 or 5 after the ÷3 snap.  Max 8 per reference UI.
    const teamSize = Number(body.teamSize ?? 4);
    const resetExisting = body.resetExisting !== false;

    if (!batchId || !courseId) {
      return NextResponse.json({ error: "batchId and courseId are required" }, { status: 400 });
    }

    if (!Number.isInteger(teamSize) || teamSize < 2 || teamSize > 8) {
      return NextResponse.json({ error: "teamSize must be an integer between 2 and 8" }, { status: 400 });
    }

    const [batch, course] = await Promise.all([
      db.batch.findUnique({
        where: { id: batchId },
        select: {
          id: true,
          departmentId: true,
          semester: true,
          students: {
            orderBy: [{ rollNumber: "asc" }],
            select: { id: true, rollNumber: true },
          },
        },
      }),
      db.course.findUnique({
        where: { id: courseId },
        select: { id: true, departmentId: true, semester: true, code: true, name: true },
      }),
    ]);

    if (!batch || !course) {
      return NextResponse.json({ error: "Invalid batchId or courseId" }, { status: 400 });
    }

    if (batch.departmentId !== course.departmentId || batch.semester !== course.semester) {
      return NextResponse.json(
        { error: "Batch and course must belong to same department and semester" },
        { status: 400 },
      );
    }

    if (batch.students.length < 4) {
      return NextResponse.json({ error: "Need at least 4 students to generate teams" }, { status: 409 });
    }

    const n = batch.students.length;
    const rawK = computeK(n, teamSize);
    const { k, adjusted } = snapKToMultipleOf3(rawK, n);
    const chunks = buildTeamChunks(batch.students, k);
    const t5 = n - 4 * k; // how many teams of 5
    const t4 = 5 * k - n; // how many teams of 4

    await db.$transaction(async (tx) => {
      if (resetExisting) {
        await tx.teamMember.deleteMany({
          where: {
            team: { cycleId, batchId, courseId },
          },
        });
        await tx.assignment.deleteMany({ where: { cycleId, batchId, courseId } });
        await tx.team.deleteMany({ where: { cycleId, batchId, courseId } });
      }

      for (let i = 0; i < chunks.length; i += 1) {
        const teamName = `Team ${String(i + 1).padStart(2, "0")}`;
        const team = await tx.team.create({
          data: {
            cycleId,
            batchId,
            courseId,
            name: teamName,
            createdBy: authz.session?.user?.email ?? null,
          },
          select: { id: true },
        });

        await tx.teamMember.createMany({
          data: chunks[i].map((student, idx) => ({
            teamId: team.id,
            studentId: student.id,
            memberIndex: idx + 1,
          })),
        });

        // Auto-generate one assignment per team (linked to this team)
        const assignTitle = `${course.code} Assignment ${String(i + 1).padStart(2, "0")}`;
        await tx.assignment.create({
          data: {
            cycleId,
            batchId,
            courseId,
            teamId: team.id,
            title: assignTitle,
            brief: `${teamName} should prepare and present an outcome-based problem statement for ${course.code} (${course.name}).`,
            status: "GENERATED",
            createdBy: authz.session?.user?.email ?? null,
          },
        });
      }
    });

    const teamCount = chunks.length;

    // Build pairing preview: which team is Presenter / Tech Reviewer / Feedback Strategist in each
    // session block.  Formula mirrors the role-mapping route so they stay in sync.
    const teamNames = Array.from({ length: k }, (_, i) => `Team ${String(i + 1).padStart(2, "0")}`);
    const pairings: Array<{ block: number; sessions: Array<{ session: number; P: string; TR: string; FP: string }> }> = [];
    for (let b = 0; b < Math.floor(k / 3); b++) {
      const sessions: Array<{ session: number; P: string; TR: string; FP: string }> = [];
      for (let s = 0; s < 3; s++) {
        const pIdx = b * 3 + s;
        sessions.push({
          session: s + 1,
          P: teamNames[pIdx % k],
          TR: teamNames[(pIdx + 1) % k],
          FP: teamNames[(pIdx + 2) % k],
        });
      }
      pairings.push({ block: b + 1, sessions });
    }

    const responseBody: Record<string, unknown> = {
      ok: true,
      teamCount,
      assignmentCount: teamCount,
      studentCount: n,
      t5,
      t4,
      pairings,
    };
    if (adjusted) {
      responseBody.message = `Adjusted from ${rawK} to ${k} teams (÷3) so every team can present, review, and give feedback exactly once per round.`;
    }
    if (k % 3 !== 0) {
      responseBody.warning = `${k} teams is not divisible by 3 — role-rotation balance won't be perfect for this batch size.`;
    }
    return NextResponse.json(responseBody);
  } catch (error) {
    const apiError = toApiError(error, "Failed to generate teams");
    return NextResponse.json(
      { error: apiError.message },
      { status: apiError.status },
    );
  }
}
