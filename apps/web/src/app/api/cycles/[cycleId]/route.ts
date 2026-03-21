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

  const cycle = await db.academicCycle.findUnique({
    where: { id: cycleId },
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
      _count: {
        select: {
          sessionPlans: true,
        },
      },
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  return NextResponse.json({ cycle });
}

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
    name?: string;
    academicYear?: string;
    semesterLabel?: string;
    startDate?: string;
    endDate?: string;
    action?: "ACTIVATE" | "COMPLETE";
  };

  const existing = await db.academicCycle.findUnique({
    where: { id: cycleId },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  if (body.action) {
    if (body.action === "ACTIVATE" && existing.status !== "DRAFT") {
      return NextResponse.json({ error: "Only DRAFT cycle can be activated" }, { status: 409 });
    }

    if (body.action === "COMPLETE" && existing.status !== "ACTIVE") {
      return NextResponse.json({ error: "Only ACTIVE cycle can be completed" }, { status: 409 });
    }

    const updated = await db.academicCycle.update({
      where: { id: cycleId },
      data: {
        status: body.action === "ACTIVATE" ? "ACTIVE" : "COMPLETED",
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

    return NextResponse.json({ cycle: updated });
  }

  const data: {
    name?: string;
    academicYear?: string;
    semesterLabel?: string;
    startDate?: Date;
    endDate?: Date;
  } = {};

  if (typeof body.name === "string") {
    const value = body.name.trim();
    if (!value) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = value;
  }

  if (typeof body.academicYear === "string") {
    const value = body.academicYear.trim();
    if (!value) {
      return NextResponse.json({ error: "academicYear cannot be empty" }, { status: 400 });
    }
    data.academicYear = value;
  }

  if (typeof body.semesterLabel === "string") {
    const value = body.semesterLabel.trim();
    if (!value) {
      return NextResponse.json({ error: "semesterLabel cannot be empty" }, { status: 400 });
    }
    data.semesterLabel = value;
  }

  if (typeof body.startDate === "string") {
    const value = parseDate(body.startDate);
    if (!value) {
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    }
    data.startDate = value;
  }

  if (typeof body.endDate === "string") {
    const value = parseDate(body.endDate);
    if (!value) {
      return NextResponse.json({ error: "Invalid endDate" }, { status: 400 });
    }
    data.endDate = value;
  }

  const effectiveStart = data.startDate;
  const effectiveEnd = data.endDate;

  if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
    return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
  }

  const updated = await db.academicCycle.update({
    where: { id: cycleId },
    data,
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

  return NextResponse.json({ cycle: updated });
}

