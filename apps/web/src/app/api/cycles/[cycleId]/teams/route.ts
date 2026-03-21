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

/** Fisher-Yates shuffle — matches reference `shuf` helper exactly. */
function shuffle<T>(arr: T[]): T[] {
  const b = [...arr];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

type Student = { id: string; rollNumber: string; gender: string | null };
type GenderMode = "STANDARD" | "IGNORE" | "CLUSTER_FEMALE";

/**
 * Build k gender-balanced, randomly-shuffled team chunks.
 * Mirrors the reference platform's generateTeams() distributing logic exactly:
 *
 * STANDARD (default): Shuffle M and F pools separately; fill each team
 *   ~half/half (max 1 M/F difference).  Leftovers distributed round-robin.
 *
 * IGNORE: Shuffle all students together; fill teams sequentially.
 *
 * CLUSTER_FEMALE: Form all-female teams first (as many as fPool can fill),
 *   then standard mixed balance for remaining teams.
 *
 * Team sizes follow base = floor(n/k), rem = n%k so the first `rem` teams
 * get one extra member.  For our valid k values (teams of 4 or 5) this equals
 * the t5/t4 formula used elsewhere.
 */
function buildGenderBalancedChunks(
  students: Student[],
  k: number,
  mode: GenderMode,
): Student[][] {
  const n = students.length;
  const base = Math.floor(n / k);
  const rem = n % k;
  const sizes = Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0));
  const teams: Student[][] = Array.from({ length: k }, () => []);

  if (mode === "IGNORE") {
    const all = shuffle([...students]);
    teams.forEach((t, i) => {
      t.push(...all.splice(0, sizes[i]));
    });
    // distribute any leftovers round-robin
    all.forEach((s, i) => teams[i % k].push(s));
    return teams;
  }

  const mPool = shuffle(students.filter((s) => s.gender === "M"));
  const fPool = shuffle(students.filter((s) => s.gender === "F"));
  // Students with no gender info get shuffled into mPool for distribution
  shuffle(students.filter((s) => s.gender !== "M" && s.gender !== "F")).forEach((s) =>
    mPool.push(s),
  );

  if (mode === "CLUSTER_FEMALE") {
    let tIdx = 0;
    const femaleTeamCount = Math.min(Math.floor(fPool.length / 4), k);
    for (let ft = 0; ft < femaleTeamCount && tIdx < k; ft++, tIdx++) {
      const sz = sizes[tIdx];
      if (fPool.length >= sz) {
        for (let j = 0; j < sz; j++) teams[tIdx].push(fPool.shift()!);
      } else {
        break;
      }
    }
    // Remaining teams: standard mixed balance
    for (let i = tIdx; i < k; i++) {
      const sz = sizes[i];
      const half = Math.floor(sz / 2);
      const odd = sz % 2;
      let wantM = half;
      let wantF = half;
      if (odd) {
        if (mPool.length >= fPool.length) wantM++;
        else wantF++;
      }
      wantM = Math.min(wantM, mPool.length);
      wantF = Math.min(wantF, fPool.length);
      let need = sz - wantM - wantF;
      if (need > 0) {
        const xM = Math.min(need, mPool.length);
        wantM += xM;
        need -= xM;
      }
      if (need > 0 && fPool.length > wantF) {
        const xF = Math.min(need, fPool.length - wantF);
        wantF += xF;
      }
      for (let j = 0; j < wantM; j++) { const s = mPool.shift(); if (s) teams[i].push(s); }
      for (let j = 0; j < wantF; j++) { const s = fPool.shift(); if (s) teams[i].push(s); }
    }
    // distribute leftovers
    [...mPool, ...fPool].forEach((s, i) => teams[i % k].push(s));
    return teams;
  }

  // STANDARD: max ~1 M/F difference per team
  teams.forEach((t, i) => {
    const sz = sizes[i];
    const half = Math.floor(sz / 2);
    const odd = sz % 2;
    let wantM = half;
    let wantF = half;
    if (odd) {
      if (mPool.length >= fPool.length) wantM++;
      else wantF++;
    }
    wantM = Math.min(wantM, mPool.length);
    wantF = Math.min(wantF, fPool.length);
    let need = sz - wantM - wantF;
    if (need > 0) {
      const xM = Math.min(need, mPool.length - wantM);
      wantM += xM;
      need -= xM;
    }
    if (need > 0) {
      const xF = Math.min(need, fPool.length - wantF);
      wantF += xF;
    }
    for (let j = 0; j < wantM; j++) t.push(mPool.shift()!);
    for (let j = 0; j < wantF; j++) t.push(fPool.shift()!);
  });
  // distribute leftovers
  [...mPool, ...fPool].forEach((s, i) => teams[i % k].push(s));
  return teams;
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
            student: { select: { id: true, rollNumber: true, name: true, gender: true } },
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
      genderMode?: string;
      resetExisting?: boolean;
    };

    const batchId = body.batchId?.trim();
    const courseId = body.courseId?.trim();
    // teamSize is a preferred hint (default 4, matching reference platform); actual
    // team sizes will be 4 or 5 after the ÷3 snap.  Max 8 per reference UI.
    const teamSize = Number(body.teamSize ?? 4);
    const genderMode: GenderMode =
      body.genderMode === "IGNORE"
        ? "IGNORE"
        : body.genderMode === "CLUSTER_FEMALE"
          ? "CLUSTER_FEMALE"
          : "STANDARD";
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
            select: { id: true, rollNumber: true, gender: true },
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
    const chunks = buildGenderBalancedChunks(batch.students, k, genderMode);
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
