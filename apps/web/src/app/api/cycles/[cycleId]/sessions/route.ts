import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function GET(_request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId } = await context.params;

  const sessions = await db.sessionPlan.findMany({
    where: { cycleId },
    orderBy: [{ blockIndex: "asc" }, { sessionIndex: "asc" }],
    select: {
      id: true,
      cycleId: true,
      batchId: true,
      courseId: true,
      facultyId: true,
      blockIndex: true,
      sessionIndex: true,
      date: true,
      status: true,
      batch: { select: { label: true } },
      course: { select: { code: true, name: true } },
      faculty: { select: { name: true, staffCode: true } },
    },
  });

  return NextResponse.json({ sessions });
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
    facultyId?: string;
    blockIndex?: number;
    sessionIndex?: number;
    date?: string;
    status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";
  };

  const batchId = body.batchId?.trim();
  const courseId = body.courseId?.trim();
  const facultyId = body.facultyId?.trim();
  const blockIndex = Number(body.blockIndex);
  const sessionIndex = Number(body.sessionIndex);

  if (!batchId || !courseId || !facultyId) {
    return NextResponse.json({ error: "batchId, courseId and facultyId are required" }, { status: 400 });
  }

  if (!Number.isInteger(blockIndex) || blockIndex < 1) {
    return NextResponse.json({ error: "blockIndex must be a positive integer" }, { status: 400 });
  }

  if (!Number.isInteger(sessionIndex) || sessionIndex < 1) {
    return NextResponse.json({ error: "sessionIndex must be a positive integer" }, { status: 400 });
  }

  const date = body.date ? parseDate(body.date) : null;
  if (body.date && !date) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const status = body.status ?? "PLANNED";

  const [batch, course, faculty] = await Promise.all([
    db.batch.findUnique({
      where: { id: batchId },
      select: { id: true, departmentId: true, semester: true, regulation: true },
    }),
    db.course.findUnique({
      where: { id: courseId },
      select: { id: true, departmentId: true, semester: true, regulation: true },
    }),
    db.faculty.findUnique({
      where: { id: facultyId },
      select: { id: true, departmentId: true },
    }),
  ]);

  if (!batch || !course || !faculty) {
    return NextResponse.json(
      { error: "Invalid batchId, courseId, or facultyId" },
      { status: 400 },
    );
  }

  if (course.departmentId !== batch.departmentId) {
    return NextResponse.json(
      { error: "Selected course does not belong to the selected batch department" },
      { status: 400 },
    );
  }

  if (course.semester !== batch.semester) {
    return NextResponse.json(
      { error: "Selected course semester does not match selected batch semester" },
      { status: 400 },
    );
  }

  if (faculty.departmentId !== batch.departmentId) {
    return NextResponse.json(
      { error: "Selected faculty does not belong to the selected batch department" },
      { status: 400 },
    );
  }

  try {
    const session = await db.sessionPlan.create({
      data: {
        cycleId,
        batchId,
        courseId,
        facultyId,
        blockIndex,
        sessionIndex,
        date,
        status,
      },
      select: {
        id: true,
        cycleId: true,
        batchId: true,
        courseId: true,
        facultyId: true,
        blockIndex: true,
        sessionIndex: true,
        date: true,
        status: true,
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Could not create session plan. Verify IDs and uniqueness constraints." },
      { status: 409 },
    );
  }
}

