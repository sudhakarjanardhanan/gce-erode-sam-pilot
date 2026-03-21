import { NextResponse } from "next/server";

import { requireSessionRoles } from "@/lib/auth/roleGuard";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("departmentId")?.trim() || undefined;

  const batches = await db.batch.findMany({
    where: departmentId ? { departmentId } : undefined,
    orderBy: [{ year: "desc" }, { semester: "asc" }, { label: "asc" }],
    select: {
      id: true,
      label: true,
      year: true,
      semester: true,
      regulation: true,
      departmentId: true,
      department: { select: { name: true } },
      _count: { select: { students: true } },
    },
    take: 500,
  });

  return NextResponse.json({ batches });
}

export async function POST(request: Request) {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const body = (await request.json()) as {
    label?: string;
    year?: number;
    semester?: number;
    regulation?: string;
    departmentId?: string;
  };

  const label = body.label?.trim();
  const regulation = body.regulation?.trim();
  const departmentId = body.departmentId?.trim();
  const year = Number(body.year);
  const semester = Number(body.semester);

  if (!label || !regulation || !departmentId || !Number.isInteger(year) || !Number.isInteger(semester)) {
    return NextResponse.json(
      { error: "label, regulation, departmentId, year, and semester are required" },
      { status: 400 },
    );
  }

  if (semester < 1 || semester > 8) {
    return NextResponse.json({ error: "semester must be between 1 and 8" }, { status: 400 });
  }

  try {
    const batch = await db.batch.create({
      data: {
        label,
        year,
        semester,
        regulation,
        departmentId,
      },
      select: {
        id: true,
        label: true,
        year: true,
        semester: true,
        regulation: true,
        departmentId: true,
      },
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Could not create batch. Ensure department exists and uniqueness is satisfied." },
      { status: 409 },
    );
  }
}

