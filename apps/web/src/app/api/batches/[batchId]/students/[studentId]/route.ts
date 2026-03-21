import { NextResponse } from "next/server";

import { requireSessionRoles } from "@/lib/auth/roleGuard";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ batchId: string; studentId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { batchId, studentId } = await context.params;
  const body = (await request.json()) as {
    rollNumber?: string;
    name?: string;
    email?: string | null;
  };

  const exists = await db.student.findFirst({
    where: { id: studentId, batchId },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const data: {
    rollNumber?: string;
    name?: string;
    email?: string | null;
  } = {};

  if (typeof body.rollNumber === "string") {
    const value = body.rollNumber.trim();
    if (!value) {
      return NextResponse.json({ error: "rollNumber cannot be empty" }, { status: 400 });
    }
    data.rollNumber = value;
  }

  if (typeof body.name === "string") {
    const value = body.name.trim();
    if (!value) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = value;
  }

  if (body.email === null) {
    data.email = null;
  } else if (typeof body.email === "string") {
    const value = body.email.trim().toLowerCase();
    data.email = value || null;
  }

  try {
    const student = await db.student.update({
      where: { id: studentId },
      data,
      select: {
        id: true,
        rollNumber: true,
        name: true,
        email: true,
        batchId: true,
      },
    });

    return NextResponse.json({ student });
  } catch {
    return NextResponse.json({ error: "Could not update student" }, { status: 409 });
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

  const { batchId, studentId } = await context.params;

  const exists = await db.student.findFirst({
    where: { id: studentId, batchId },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  await db.student.delete({ where: { id: studentId } });

  return NextResponse.json({ ok: true });
}

