import { NextResponse } from "next/server";

import { requireSessionRoles } from "@/lib/auth/roleGuard";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { batchId } = await context.params;

  const batch = await db.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      label: true,
      year: true,
      semester: true,
      regulation: true,
      departmentId: true,
      department: { select: { name: true } },
      _count: { select: { students: true, sessionPlans: true } },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  return NextResponse.json({ batch });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { batchId } = await context.params;

  const body = (await request.json()) as {
    label?: string;
    year?: number;
    semester?: number;
    regulation?: string;
    departmentId?: string;
  };

  const data: {
    label?: string;
    year?: number;
    semester?: number;
    regulation?: string;
    departmentId?: string;
  } = {};

  if (typeof body.label === "string") {
    const value = body.label.trim();
    if (!value) {
      return NextResponse.json({ error: "label cannot be empty" }, { status: 400 });
    }
    data.label = value;
  }

  if (typeof body.year === "number") {
    if (!Number.isInteger(body.year)) {
      return NextResponse.json({ error: "year must be an integer" }, { status: 400 });
    }
    data.year = body.year;
  }

  if (typeof body.semester === "number") {
    if (!Number.isInteger(body.semester) || body.semester < 1 || body.semester > 8) {
      return NextResponse.json({ error: "semester must be between 1 and 8" }, { status: 400 });
    }
    data.semester = body.semester;
  }

  if (typeof body.regulation === "string") {
    const value = body.regulation.trim();
    if (!value) {
      return NextResponse.json({ error: "regulation cannot be empty" }, { status: 400 });
    }
    data.regulation = value;
  }

  if (typeof body.departmentId === "string") {
    const value = body.departmentId.trim();
    if (!value) {
      return NextResponse.json({ error: "departmentId cannot be empty" }, { status: 400 });
    }
    data.departmentId = value;
  }

  try {
    const batch = await db.batch.update({
      where: { id: batchId },
      data,
      select: {
        id: true,
        label: true,
        year: true,
        semester: true,
        regulation: true,
        departmentId: true,
      },
    });

    return NextResponse.json({ batch });
  } catch {
    return NextResponse.json({ error: "Could not update batch" }, { status: 409 });
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

  const { batchId } = await context.params;

  const batch = await db.batch.findUnique({
    where: { id: batchId },
    select: { _count: { select: { students: true, sessionPlans: true } } },
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  if (batch._count.students > 0 || batch._count.sessionPlans > 0) {
    return NextResponse.json(
      { error: "Cannot delete batch with students or session plans" },
      { status: 409 },
    );
  }

  await db.batch.delete({ where: { id: batchId } });

  return NextResponse.json({ ok: true });
}

