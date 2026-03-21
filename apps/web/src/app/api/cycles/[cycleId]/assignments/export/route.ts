import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

const ASSIGN_TYPE_LABELS: Record<string, string> = {
  presentation: "Topic Presentation",
  mini_project: "Mini Project",
  practical: "Practical Exercise",
  problem_solve: "Problem Solving",
};

const BLOOM_LABELS: Record<number, string> = {
  1: "Remember",
  2: "Understand",
  3: "Apply",
  4: "Analyse",
  5: "Evaluate",
};

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

/**
 * GET /api/cycles/[cycleId]/assignments/export?batchId=...&courseId=...&format=csv|json
 * Export assignments in CSV or JSON format (reference: p3ExportCSV)
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
    return NextResponse.json({ error: "batchId and courseId are required" }, { status: 400 });
  }

  const assignments = await db.assignment.findMany({
    where: { cycleId, batchId, courseId },
    orderBy: [{ isReserve: "asc" }, { sessionSlot: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      assignType: true,
      unit: true,
      bloomLevel: true,
      learningObjectives: true,
      sessionSlot: true,
      isReserve: true,
      approved: true,
      status: true,
      team: {
        select: {
          name: true,
          members: {
            orderBy: [{ memberIndex: "asc" }],
            select: { student: { select: { rollNumber: true, name: true } } },
          },
        },
      },
      course: { select: { code: true, name: true } },
      batch: { select: { label: true, departmentId: true } },
    },
  });

  if (format === "json") {
    const jsonData = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.assignType,
      typeLabel: ASSIGN_TYPE_LABELS[a.assignType ?? ""] ?? a.assignType,
      unit: a.unit,
      bloomLevel: a.bloomLevel,
      bloomLabel: a.bloomLevel ? BLOOM_LABELS[a.bloomLevel] : null,
      sessionSlot: a.sessionSlot,
      isReserve: a.isReserve,
      approved: a.approved,
      team: a.team.name,
      members: a.team.members.map((m) => ({
        rollNumber: m.student.rollNumber,
        name: m.student.name,
      })),
      learningObjectives: a.learningObjectives,
      course: a.course.code,
      courseName: a.course.name,
      batch: a.batch.label,
      department: a.batch.departmentId,
    }));

    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="assignments_${assignments[0]?.batch.departmentId ?? "export"}_${assignments[0]?.course.code ?? ""}.json"`,
      },
    });
  }

  // CSV — matches reference p3ExportCSV structure
  const rows: string[] = [];
  rows.push(
    [
      "Session Slot",
      "Team",
      "Team Members (Names)",
      "Member Roll Numbers",
      "Unit / Topic",
      "Assignment Type",
      "Bloom Level",
      "Bloom Label",
      "Learning Outcome",
      "Is Reserve",
      "Approved",
      "Course Code",
      "Course Name",
      "Department",
      "Batch",
    ].join(","),
  );

  for (const a of assignments) {
    const memberNames = a.team.members.map((m) => m.student.name).join("; ");
    const memberRolls = a.team.members.map((m) => m.student.rollNumber).join("; ");
    rows.push(
      [
        a.sessionSlot ?? "—",
        csvEscape(a.team.name),
        csvEscape(memberNames),
        csvEscape(memberRolls),
        csvEscape(a.unit ?? ""),
        csvEscape(ASSIGN_TYPE_LABELS[a.assignType ?? ""] ?? a.assignType ?? ""),
        a.bloomLevel ? `L${a.bloomLevel}` : "",
        a.bloomLevel ? BLOOM_LABELS[a.bloomLevel] ?? "" : "",
        csvEscape(a.learningObjectives[0] ?? ""),
        a.isReserve ? "Yes" : "No",
        a.approved ? "Yes" : "No",
        csvEscape(a.course.code),
        csvEscape(a.course.name),
        csvEscape(a.batch.departmentId),
        csvEscape(a.batch.label),
      ].join(","),
    );
  }

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="assignments_${assignments[0]?.batch.departmentId ?? "export"}_${assignments[0]?.course.code ?? ""}.csv"`,
    },
  });
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
