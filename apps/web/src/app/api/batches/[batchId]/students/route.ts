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

  const students = await db.student.findMany({
    where: { batchId },
    orderBy: [{ rollNumber: "asc" }],
    select: {
      id: true,
      rollNumber: true,
      name: true,
      email: true,
      batchId: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 2000,
  });

  return NextResponse.json({ students });
}

export async function POST(request: Request, context: RouteContext) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { batchId } = await context.params;

  const body = (await request.json()) as {
    rollNumber?: string;
    name?: string;
    email?: string;
  };

  const rollNumber = body.rollNumber?.trim();
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase() || null;

  if (!rollNumber || !name) {
    return NextResponse.json({ error: "rollNumber and name are required" }, { status: 400 });
  }

  try {
    const student = await db.student.create({
      data: {
        batchId,
        rollNumber,
        name,
        email,
      },
      select: {
        id: true,
        rollNumber: true,
        name: true,
        email: true,
        batchId: true,
      },
    });

    return NextResponse.json({ student }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Could not create student. Ensure roll number is unique and batch exists." },
      { status: 409 },
    );
  }
}

