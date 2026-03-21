import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

export async function GET() {
  try {
    const authz = await requireSessionRoles(["ADMIN", "HOD", "PRINCIPAL"]);
    if (!authz.ok) {
      return NextResponse.json(
        { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
        { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
      );
    }

    const [batches, courses, faculty] = await Promise.all([
      db.batch.findMany({
        orderBy: [{ year: "desc" }, { semester: "asc" }, { label: "asc" }],
        select: {
          id: true,
          label: true,
          year: true,
          semester: true,
          regulation: true,
          departmentId: true,
        },
        take: 500,
      }),
      db.course.findMany({
        orderBy: [{ code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          semester: true,
          regulation: true,
          departmentId: true,
        },
        take: 1000,
      }),
      db.faculty.findMany({
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          staffCode: true,
          departmentId: true,
        },
        take: 500,
      }),
    ]);

    return NextResponse.json({
      batches,
      courses,
      faculty,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load cycle options" },
      { status: 500 },
    );
  }
}

