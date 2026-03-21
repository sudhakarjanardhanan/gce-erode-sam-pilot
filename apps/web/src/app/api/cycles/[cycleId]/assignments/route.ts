import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";
import { getUnitsForCourse } from "@/lib/syllabus";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

// ── Constants matching reference v738 ──────────────────────────────────────

const ASGN_TYPE_ORDER = [
  "presentation",
  "mini_project",
  "practical",
  "problem_solve",
] as const;
type AssignType = (typeof ASGN_TYPE_ORDER)[number];

const BLOOM_LEVELS: Record<number, { label: string; desc: string }> = {
  1: { label: "Remember", desc: "Recall, define, list, identify" },
  2: { label: "Understand", desc: "Explain, summarise, classify" },
  3: { label: "Apply", desc: "Solve, demonstrate, use, execute" },
  4: { label: "Analyse", desc: "Differentiate, organise, compare" },
  5: { label: "Evaluate", desc: "Judge, critique, justify, defend" },
};

function bloomLevelsForCycle(cycleNum: number): number[] {
  return cycleNum === 1 ? [1, 2, 3] : [2, 3, 4];
}

// ── Verb phrases per assignment type (reference p3BuildTitle) ──────────────

const TITLE_VERBS: Record<AssignType, string[]> = {
  presentation: [
    "Present and Explain",
    "Deliver a Topic Talk on",
    "Teach the Concept of",
    "Demonstrate Understanding of",
    "Explain with Examples:",
  ],
  mini_project: [
    "Mini Project — Design & Build:",
    "Prototype Development:",
    "Working Implementation of",
    "Build a Solution for",
    "Mini Project — Develop & Demo:",
  ],
  practical: [
    "Conduct a Hands-On Exercise on",
    "Perform and Document:",
    "Execute and Analyse:",
    "Practise the Technique of",
    "Lab Experiment:",
  ],
  problem_solve: [
    "Solve a Problem Set on",
    "Apply Concepts from",
    "Work Through Challenges in",
    "Analyse and Solve:",
    "Critical Thinking Exercise on",
  ],
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

function buildTitle(aType: AssignType, unit: string): string {
  const pool = TITLE_VERBS[aType];
  const verb = pool[hashString(unit) % pool.length];
  const shortUnit = unit.length > 50 ? unit.substring(0, 47) + "…" : unit;
  return `${verb} ${shortUnit}`;
}

// ── Description templates (reference ASSIGN_TPL + Bloom context) ───────────

const ASSIGN_TPL: Record<AssignType, (topic: string, subject: string, code: string) => string> = {
  presentation: (t, s, code) =>
    `🎤 Topic Presentation — ${t}\n${code}: ${s}\n\n` +
    `Prepare and deliver a 10-minute presentation on ${t}, explaining its principles and applications in ${s}.\n\n` +
    `Slide deck (10–12 slides):\n` +
    `• Title slide: topic, team, date\n` +
    `• 2 slides: Introduction & motivation\n` +
    `• 4 slides: Core concepts, diagrams & worked example\n` +
    `• 2 slides: Real-world applications & recent advances\n` +
    `• 1 slide: Summary & Q&A prompt\n\n` +
    `Marks: Content 40% · Clarity 25% · Visuals 15% · Q&A 20%`,

  mini_project: (t, s, code) =>
    `🔧 Mini Project — ${t}\n${code}: ${s}\n\n` +
    `Build a small but complete working project that solves a real problem using concepts from ${t}.\n\n` +
    `Deliverables:\n` +
    `• Problem statement & scope (1 page)\n` +
    `• Architecture / block diagram with component justification\n` +
    `• Working implementation (source code + executable/demo)\n` +
    `• Test plan with ≥5 test cases and observed results\n` +
    `• Project report (8–12 pages) + 5-min demo video\n\n` +
    `Marks: Design 25% · Implementation 35% · Testing 20% · Report 10% · Demo 10%`,

  practical: (t, s, code) =>
    `⚗️ Practical Exercise — ${t}\n${code}: ${s}\n\n` +
    `Conduct a structured hands-on exercise on ${t} as covered in ${s}.\n\n` +
    `Lab record must include:\n` +
    `• Aim & theoretical background\n` +
    `• Materials / software / tools used\n` +
    `• Step-by-step procedure (with screenshots)\n` +
    `• Observations & data table\n` +
    `• Results, analysis & error discussion\n` +
    `• Conclusion & real-world relevance\n\n` +
    `Viva questions will test underlying theory from ${s}.`,

  problem_solve: (t, s, code) =>
    `🧮 Problem Set — ${t}\n${code}: ${s}\n\n` +
    `Solve 8–10 curated problems on ${t} drawn from past papers and industry scenarios in ${s}.\n\n` +
    `Submission rules:\n` +
    `• Show complete working — no step may be skipped\n` +
    `• State the formula / theorem before each solution\n` +
    `• Verify answers (substitute back / unit check)\n` +
    `• Include 1 self-composed problem with full solution\n\n` +
    `Bonus (+5%): Solve one extension problem from a competitive exam.`,
};

function buildDescription(aType: AssignType, topic: string, code: string, subject: string, bloomLevel: number): string {
  const base = ASSIGN_TPL[aType](topic, subject, code);
  const bloomInfo = BLOOM_LEVELS[bloomLevel];
  return (
    base +
    `\n\n📊 Bloom's Level ${bloomLevel} — ${bloomInfo.label}: ` +
    `This assessment targets "${bloomInfo.desc}". ` +
    `Students are expected to operate at the ${bloomInfo.label} cognitive level.`
  );
}

function buildLearningObjectives(bloomLevel: number, unit: string, courseCode: string): string[] {
  const bloomInfo = BLOOM_LEVELS[bloomLevel];
  return [
    `LO1: Students will be able to ${bloomInfo.desc.split(",")[0].toLowerCase()} key concepts from "${unit}"`,
    `LO2: Apply ${bloomInfo.label}-level thinking to evaluate real-world scenarios`,
    `LO3: Demonstrate problem-solving aligned with ${courseCode} outcomes`,
  ];
}

// ── GET: List assignments ─────────────────────────────────────────────────

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
    orderBy: [{ isReserve: "asc" }, { sessionSlot: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      brief: true,
      assignType: true,
      unit: true,
      bloomLevel: true,
      learningObjectives: true,
      sessionSlot: true,
      isReserve: true,
      approved: true,
      status: true,
      team: {
        select: {
          id: true,
          name: true,
          members: {
            orderBy: [{ memberIndex: "asc" }],
            select: { student: { select: { rollNumber: true, name: true } } },
          },
        },
      },
      course: { select: { code: true, name: true } },
      batch: { select: { label: true, departmentId: true } },
    },
  });

  return NextResponse.json({ assignments });
}

// ── POST: Generate P3 assignments ─────────────────────────────────────────

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
    cycleNum?: number;
    mode?: string;
    singleType?: string;
    resetExisting?: boolean;
  };

  const batchId = body.batchId?.trim();
  const courseId = body.courseId?.trim();
  const cycleNum = Number(body.cycleNum ?? 1);
  const mode = body.mode === "single" ? "single" : "auto";
  const singleType = (body.singleType ?? "presentation") as AssignType;
  const resetExisting = body.resetExisting !== false;

  if (!batchId || !courseId) {
    return NextResponse.json({ error: "batchId and courseId are required" }, { status: 400 });
  }

  const [course, teams] = await Promise.all([
    db.course.findUnique({
      where: { id: courseId },
      select: { code: true, name: true, departmentId: true },
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

  const units = await getUnitsForCourse(course.departmentId, course.code);
  if (units.length === 0) {
    return NextResponse.json(
      { error: `No syllabus units found for ${course.code} in department ${course.departmentId}. Check docs/syllabus/${course.departmentId}.md.` },
      { status: 409 },
    );
  }

  const bloomRange = bloomLevelsForCycle(cycleNum);
  const totalActive = 12;
  const totalReserve = 3;
  const totalNeeded = totalActive + totalReserve;

  type AssignmentRecord = {
    title: string;
    brief: string;
    assignType: AssignType;
    unit: string;
    bloomLevel: number;
    learningObjectives: string[];
    sessionSlot: number | null;
    isReserve: boolean;
    teamId: string;
  };

  const assignments: AssignmentRecord[] = [];

  if (mode === "auto") {
    const typePool = [...ASGN_TYPE_ORDER];
    const usedCombos = new Set<string>();
    let unitIdx = 0;
    let typeIdx = 0;
    let bloomIdx = 0;
    let slotNum = 1;

    while (assignments.length < totalNeeded) {
      const unit = units[unitIdx % units.length];
      const aType = typePool[typeIdx % typePool.length];
      const bloom = bloomRange[bloomIdx % bloomRange.length];
      const combo = `${unit}|${aType}|${bloom}`;

      if (!usedCombos.has(combo)) {
        usedCombos.add(combo);
        const isReserve = assignments.length >= totalActive;
        const sessionSlot = isReserve ? null : slotNum++;
        const teamIdx = isReserve ? null : assignments.length % teams.length;
        const team = teamIdx !== null ? teams[teamIdx] : teams[0];

        assignments.push({
          title: buildTitle(aType, unit),
          brief: buildDescription(aType, unit, course.code, course.name, bloom),
          assignType: aType,
          unit,
          bloomLevel: bloom,
          learningObjectives: buildLearningObjectives(bloom, unit, course.code),
          sessionSlot,
          isReserve,
          teamId: team.id,
        });
      }

      unitIdx++;
      if (unitIdx % units.length === 0) typeIdx++;
      if (typeIdx % typePool.length === 0) bloomIdx++;

      if (unitIdx > units.length * typePool.length * bloomRange.length * 2) {
        usedCombos.clear();
      }
    }
  } else {
    const shuffledUnits = [...units].sort(() => Math.random() - 0.5);
    const pool: string[] = [];
    const usedTopics = new Set<string>();
    while (pool.length < totalNeeded) {
      for (const u of shuffledUnits) {
        if (pool.length >= totalNeeded) break;
        if (!usedTopics.has(u)) {
          usedTopics.add(u);
          pool.push(u);
        }
      }
      if (pool.length < totalNeeded) usedTopics.clear();
    }

    let slotNum = 1;
    for (let i = 0; i < totalNeeded; i++) {
      const unit = pool[i];
      const bloom = bloomRange[i % bloomRange.length];
      const isReserve = i >= totalActive;
      const sessionSlot = isReserve ? null : slotNum++;
      const teamIdx = isReserve ? null : i % teams.length;
      const team = teamIdx !== null ? teams[teamIdx] : teams[0];

      assignments.push({
        title: buildTitle(singleType, unit),
        brief: buildDescription(singleType, unit, course.code, course.name, bloom),
        assignType: singleType,
        unit,
        bloomLevel: bloom,
        learningObjectives: buildLearningObjectives(bloom, unit, course.code),
        sessionSlot,
        isReserve,
        teamId: team.id,
      });
    }
  }

  await db.$transaction(async (tx) => {
    if (resetExisting) {
      await tx.assignment.deleteMany({ where: { cycleId, batchId, courseId } });
    }

    for (const a of assignments) {
      await tx.assignment.create({
        data: {
          cycleId,
          batchId,
          courseId,
          teamId: a.teamId,
          title: a.title,
          brief: a.brief,
          assignType: a.assignType,
          unit: a.unit,
          bloomLevel: a.bloomLevel,
          learningObjectives: a.learningObjectives,
          sessionSlot: a.sessionSlot,
          isReserve: a.isReserve,
          approved: false,
          status: "GENERATED",
          createdBy: authz.session?.user?.email ?? null,
        },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    assignmentCount: assignments.length,
    activeCount: totalActive,
    reserveCount: totalReserve,
    cycleNum,
    bloomRange: bloomRange.map((l) => ({ level: l, ...BLOOM_LEVELS[l] })),
  });
}

// ── PATCH: Approve / activate reserve ─────────────────────────────────────

export async function PATCH(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId } = await context.params;
  const body = (await request.json()) as {
    action: "approve" | "approve_all" | "activate_reserve";
    assignmentId?: string;
    batchId?: string;
    courseId?: string;
  };

  if (body.action === "approve" && body.assignmentId) {
    await db.assignment.update({
      where: { id: body.assignmentId },
      data: { approved: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "approve_all" && body.batchId && body.courseId) {
    await db.assignment.updateMany({
      where: { cycleId, batchId: body.batchId, courseId: body.courseId, isReserve: false },
      data: { approved: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "activate_reserve" && body.assignmentId) {
    const reserve = await db.assignment.findFirst({
      where: { id: body.assignmentId, isReserve: true },
    });
    if (!reserve) {
      return NextResponse.json({ error: "Reserve assignment not found" }, { status: 404 });
    }
    const maxSlotResult = await db.assignment.aggregate({
      where: { cycleId, batchId: reserve.batchId, courseId: reserve.courseId, isReserve: false },
      _max: { sessionSlot: true },
    });
    const nextSlot = (maxSlotResult._max.sessionSlot ?? 0) + 1;
    await db.assignment.update({
      where: { id: body.assignmentId },
      data: { isReserve: false, sessionSlot: nextSlot, status: "GENERATED" },
    });
    return NextResponse.json({ ok: true, sessionSlot: nextSlot });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
