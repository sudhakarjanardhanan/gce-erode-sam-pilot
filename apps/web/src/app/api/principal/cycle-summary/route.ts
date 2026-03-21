/**
 * GET /api/principal/cycle-summary
 * Returns per-cycle session counts, completion stats, and per-dept breakdown.
 * Used by the Principal dashboard Current Cycle tab.
 */
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

export async function GET() {
  const authz = await requireSessionRoles(["ADMIN", "PRINCIPAL"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const cycles = await db.academicCycle.findMany({
    orderBy: [{ startDate: "desc" }],
    select: {
      id: true,
      name: true,
      academicYear: true,
      semesterLabel: true,
      status: true,
      sessionPlans: {
        select: {
          status: true,
          batch: { select: { departmentId: true } },
          _count: { select: { gradeRecords: true } },
        },
      },
    },
    take: 20,
  });

  const result = cycles.map((cycle) => {
    const sessions = cycle.sessionPlans;
    const total = sessions.length;
    const completed = sessions.filter((s) => s.status === "COMPLETED").length;
    const graded = sessions.filter((s) => s._count.gradeRecords > 0).length;

    // Per-dept breakdown
    const deptMap = new Map<string, { total: number; completed: number }>();
    for (const s of sessions) {
      const deptId = s.batch.departmentId;
      const existing = deptMap.get(deptId) ?? { total: 0, completed: 0 };
      existing.total++;
      if (s.status === "COMPLETED") { existing.completed++; }
      deptMap.set(deptId, existing);
    }

    const deptBreakdown = Array.from(deptMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([deptId, counts]) => ({ deptId, ...counts }));

    return {
      id: cycle.id,
      name: cycle.name,
      academicYear: cycle.academicYear,
      semesterLabel: cycle.semesterLabel,
      status: cycle.status,
      total,
      completed,
      graded,
      deptBreakdown,
    };
  });

  return NextResponse.json({ cycles: result });
}
