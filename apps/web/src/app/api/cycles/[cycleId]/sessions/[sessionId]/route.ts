import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

type RouteContext = {
  params: Promise<{ cycleId: string; sessionId: string }>;
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

export async function PATCH(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId, sessionId } = await context.params;
  const body = (await request.json()) as {
    batchId?: string;
    courseId?: string;
    facultyId?: string;
    blockIndex?: number;
    sessionIndex?: number;
    date?: string | null;
    status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";
  };

  const existing = await db.sessionPlan.findFirst({
    where: { id: sessionId, cycleId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Session plan not found" }, { status: 404 });
  }

  const data: {
    batchId?: string;
    courseId?: string;
    facultyId?: string;
    blockIndex?: number;
    sessionIndex?: number;
    date?: Date | null;
    status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";
  } = {};

  if (typeof body.batchId === "string") {
    const value = body.batchId.trim();
    if (!value) {
      return NextResponse.json({ error: "batchId cannot be empty" }, { status: 400 });
    }
    data.batchId = value;
  }

  if (typeof body.courseId === "string") {
    const value = body.courseId.trim();
    if (!value) {
      return NextResponse.json({ error: "courseId cannot be empty" }, { status: 400 });
    }
    data.courseId = value;
  }

  if (typeof body.facultyId === "string") {
    const value = body.facultyId.trim();
    if (!value) {
      return NextResponse.json({ error: "facultyId cannot be empty" }, { status: 400 });
    }
    data.facultyId = value;
  }

  if (typeof body.blockIndex === "number") {
    if (!Number.isInteger(body.blockIndex) || body.blockIndex < 1) {
      return NextResponse.json({ error: "blockIndex must be a positive integer" }, { status: 400 });
    }
    data.blockIndex = body.blockIndex;
  }

  if (typeof body.sessionIndex === "number") {
    if (!Number.isInteger(body.sessionIndex) || body.sessionIndex < 1) {
      return NextResponse.json({ error: "sessionIndex must be a positive integer" }, { status: 400 });
    }
    data.sessionIndex = body.sessionIndex;
  }

  if (body.date === null) {
    data.date = null;
  } else if (typeof body.date === "string") {
    const value = parseDate(body.date);
    if (!value) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    data.date = value;
  }

  if (typeof body.status === "string") {
    data.status = body.status;
  }

  try {
    const session = await db.sessionPlan.update({
      where: { id: sessionId },
      data,
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

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json({ error: "Could not update session plan" }, { status: 409 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { cycleId, sessionId } = await context.params;

  const existing = await db.sessionPlan.findFirst({
    where: { id: sessionId, cycleId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Session plan not found" }, { status: 404 });
  }

  await db.sessionPlan.delete({ where: { id: sessionId } });

  return NextResponse.json({ ok: true });
}

