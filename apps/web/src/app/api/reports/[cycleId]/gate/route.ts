import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { evaluateCycleReportGate } from "@/lib/reports/cycleGate";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { cycleId } = await context.params;

  if (!cycleId) {
    return NextResponse.json({ error: "Missing cycleId" }, { status: 400 });
  }

  const gate = await evaluateCycleReportGate(cycleId);

  const latestSnapshot = await db.reportSnapshot.findFirst({
    where: { cycleId },
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      status: true,
      generatedAt: true,
      publishedAt: true,
    },
  });

  const status = gate.reason === "CYCLE_NOT_FOUND" ? 404 : 200;

  return NextResponse.json(
    {
      ok: gate.allowed,
      gate,
      latestSnapshot,
    },
    { status },
  );
}
