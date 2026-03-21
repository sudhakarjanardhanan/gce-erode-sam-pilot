import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

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

export async function GET() {
  const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const cycles = await db.academicCycle.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      academicYear: true,
      semesterLabel: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { sessionPlans: true } },
    },
  });

  return NextResponse.json({ cycles });
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
    name?: string;
    academicYear?: string;
    semesterLabel?: string;
    startDate?: string;
    endDate?: string;
  };

  const name = body.name?.trim();
  const academicYear = body.academicYear?.trim();
  const semesterLabel = body.semesterLabel?.trim();
  const startDate = parseDate(body.startDate);
  const endDate = parseDate(body.endDate);

  if (!name || !academicYear || !semesterLabel || !startDate || !endDate) {
    return NextResponse.json(
      { error: "name, academicYear, semesterLabel, startDate and endDate are required" },
      { status: 400 },
    );
  }

  if (startDate > endDate) {
    return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
  }

  const cycle = await db.academicCycle.create({
    data: {
      name,
      academicYear,
      semesterLabel,
      startDate,
      endDate,
      status: "DRAFT",
    },
    select: {
      id: true,
      name: true,
      academicYear: true,
      semesterLabel: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ cycle }, { status: 201 });
}

