import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

/**
 * GET /api/cycles/[cycleId]/teams/export?batchId=...&courseId=...&format=csv|json
 * Export teams in CSV or JSON format (reference: exportTeamsCSV / exportTeamsJSON)
 */
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
  const format = searchParams.get("format")?.toLowerCase() === "json" ? "json" : "csv";

  if (!batchId || !courseId) {
    return NextResponse.json(
      { error: "batchId and courseId are required" },
      { status: 400 },
    );
  }

  const teams = await db.team.findMany({
    where: { cycleId, batchId, courseId },
    orderBy: [{ name: "asc" }],
    select: {
      name: true,
      batch: { select: { label: true, departmentId: true } },
      course: { select: { code: true, name: true } },
      members: {
        orderBy: [{ memberIndex: "asc" }],
        select: {
          memberIndex: true,
          student: { select: { rollNumber: true, name: true, gender: true } },
        },
      },
    },
  });

  if (format === "json") {
    const jsonData = teams.map((t) => ({
      team: t.name,
      batch: t.batch.label,
      department: t.batch.departmentId,
      course: t.course.code,
      courseName: t.course.name,
      members: t.members.map((m) => ({
        rollNumber: m.student.rollNumber,
        name: m.student.name,
        gender: m.student.gender ?? "?",
      })),
    }));

    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="teams_${teams[0]?.batch.departmentId ?? "export"}_${teams[0]?.course.code ?? ""}.json"`,
      },
    });
  }

  // CSV format
  const rows: string[] = [];
  rows.push("Team,Roll Number,Student Name,Gender,Batch,Department,Course Code,Course Name");
  for (const t of teams) {
    for (const m of t.members) {
      rows.push(
        [
          csvEscape(t.name),
          csvEscape(m.student.rollNumber),
          csvEscape(m.student.name),
          m.student.gender ?? "?",
          csvEscape(t.batch.label),
          csvEscape(t.batch.departmentId),
          csvEscape(t.course.code),
          csvEscape(t.course.name),
        ].join(","),
      );
    }
  }

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="teams_${teams[0]?.batch.departmentId ?? "export"}_${teams[0]?.course.code ?? ""}.csv"`,
    },
  });
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
