import { db } from "@/lib/db";

export type CycleReportGateResult = {
  allowed: boolean;
  reason?: "CYCLE_NOT_FOUND" | "CYCLE_STATUS_NOT_COMPLETED" | "NO_SESSIONS" | "PENDING_SESSIONS";
  cycleId: string;
  cycleStatus?: string;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  pendingSessionIds: string[];
};

export async function evaluateCycleReportGate(cycleId: string): Promise<CycleReportGateResult> {
  const cycle = await db.academicCycle.findUnique({
    where: { id: cycleId },
    select: { id: true, status: true },
  });

  if (!cycle) {
    return {
      allowed: false,
      reason: "CYCLE_NOT_FOUND",
      cycleId,
      totalSessions: 0,
      completedSessions: 0,
      remainingSessions: 0,
      pendingSessionIds: [],
    };
  }

  const [totalSessions, completedSessions, pending] = await Promise.all([
    db.sessionPlan.count({ where: { cycleId } }),
    db.sessionPlan.count({ where: { cycleId, status: "COMPLETED" } }),
    db.sessionPlan.findMany({
      where: { cycleId, status: { not: "COMPLETED" } },
      select: { id: true },
      orderBy: [{ blockIndex: "asc" }, { sessionIndex: "asc" }],
      take: 50,
    }),
  ]);

  const remainingSessions = totalSessions - completedSessions;

  if (cycle.status !== "COMPLETED") {
    return {
      allowed: false,
      reason: "CYCLE_STATUS_NOT_COMPLETED",
      cycleId,
      cycleStatus: cycle.status,
      totalSessions,
      completedSessions,
      remainingSessions,
      pendingSessionIds: pending.map((p) => p.id),
    };
  }

  if (totalSessions === 0) {
    return {
      allowed: false,
      reason: "NO_SESSIONS",
      cycleId,
      cycleStatus: cycle.status,
      totalSessions,
      completedSessions,
      remainingSessions,
      pendingSessionIds: [],
    };
  }

  if (remainingSessions > 0) {
    return {
      allowed: false,
      reason: "PENDING_SESSIONS",
      cycleId,
      cycleStatus: cycle.status,
      totalSessions,
      completedSessions,
      remainingSessions,
      pendingSessionIds: pending.map((p) => p.id),
    };
  }

  return {
    allowed: true,
    cycleId,
    cycleStatus: cycle.status,
    totalSessions,
    completedSessions,
    remainingSessions,
    pendingSessionIds: [],
  };
}
