import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { evaluateCycleReportGate } from "@/lib/reports/cycleGate";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { cycleId } = await context.params;

  if (!cycleId) {
    return NextResponse.json({ error: "Missing cycleId" }, { status: 400 });
  }

  const gate = await evaluateCycleReportGate(cycleId);

  if (!gate.allowed) {
    const status = gate.reason === "CYCLE_NOT_FOUND" ? 404 : 409;
    return NextResponse.json(
      {
        error: "REPORT_GATE_BLOCKED",
        gate,
        message:
          "Report generation is allowed only when cycle status is COMPLETED and all sessions are completed.",
      },
      { status },
    );
  }

  const snapshot = await db.reportSnapshot.create({
    data: {
      cycleId,
      status: "GENERATED",
      payload: {
        generatedAt: new Date().toISOString(),
        summary: {
          totalSessions: gate.totalSessions,
          completedSessions: gate.completedSessions,
        },
      },
    },
    select: {
      id: true,
      cycleId: true,
      status: true,
      generatedAt: true,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      message: "Report snapshot generated.",
      gate,
      snapshot,
    },
    { status: 201 },
  );
}
