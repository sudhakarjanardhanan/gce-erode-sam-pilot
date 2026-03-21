/**
 * GET /api/principal/cumulative
 * Returns per-department cumulative grade statistics across all cycles.
 * Used by the Principal dashboard Cumulative tab.
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

  const departments = await db.department.findMany({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  const rows = await Promise.all(
    departments.map(async (dept) => {
      const [sessionStats, gradeStats] = await Promise.all([
        db.sessionPlan.aggregate({
          where: { batch: { departmentId: dept.id } },
          _count: { id: true },
        }),
        db.gradeRecord.aggregate({
          where: { sessionPlan: { batch: { departmentId: dept.id } } },
          _count: { id: true },
          _avg: { totalScore: true },
          _max: { maxScore: true },
        }),
      ]);

      const completedCount = await db.sessionPlan.count({
        where: {
          batch: { departmentId: dept.id },
          status: "COMPLETED",
        },
      });

      return {
        deptId: dept.id,
        totalSessions: sessionStats._count.id,
        completedSessions: completedCount,
        totalGradeRecords: gradeStats._count.id,
        avgScore: gradeStats._avg.totalScore,
        maxScore: gradeStats._max.maxScore,
      };
    }),
  );

  return NextResponse.json({ rows });
}
