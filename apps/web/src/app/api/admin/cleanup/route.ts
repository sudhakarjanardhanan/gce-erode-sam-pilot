/**
 * Admin Data Management — Cleanup Endpoints
 *
 * Matches reference platform Zones 1–4.
 *
 * GET  /api/admin/cleanup               – system summary counts (ADMIN only)
 * DELETE /api/admin/cleanup?action=<x>  – destructive operations (ADMIN only)
 *
 * Zone 1 actions:
 *   delete-all-cycles   – delete ALL AcademicCycles (cascade: sessions, grades, teams, pairings)
 *
 * Zone 2 actions:
 *   clear-sessions      – delete SessionPlans for cycle+batch+course
 *   clear-all-sessions  – delete ALL SessionPlans
 *   clear-all-grades    – delete ALL GradeRecords
 *
 * Zone 3 actions:
 *   clear-teams         – delete Teams for cycle+batch+course
 *   clear-all-teams     – delete ALL Teams
 *   clear-all-pairings  – delete ALL SessionRoleMappings
 *
 * Zone 4 actions (nuclear):
 *   reset-course        – wipe teams+sessions+grades for cycleId+batchId+courseId
 *   wipe-all-data       – delete ALL operational data (cycles, teams, sessions, grades)
 */
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireSessionRoles } from "@/lib/auth/roleGuard";

const ALL_ACTIONS = [
  "delete-all-cycles",
  "clear-sessions", "clear-all-sessions", "clear-all-grades",
  "clear-teams", "clear-all-teams", "clear-all-pairings",
  "reset-course", "wipe-all-data",
] as const;
type CleanupAction = (typeof ALL_ACTIONS)[number];

// ── GET: system summary ────────────────────────────────────────────────────
export async function GET() {
  const authz = await requireSessionRoles(["ADMIN"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const [cycles, sessions, teams, pairings, grades] = await Promise.all([
    db.academicCycle.count(),
    db.sessionPlan.count(),
    db.team.count(),
    db.sessionRoleMapping.count(),
    db.gradeRecord.count(),
  ]);

  return NextResponse.json({ cycles, sessions, teams, pairings, grades });
}

export async function DELETE(request: Request) {
  const authz = await requireSessionRoles(["ADMIN"]);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason === "UNAUTHENTICATED" ? "Unauthorized" : "Forbidden" },
      { status: authz.reason === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action") as CleanupAction | null;
  const cycleId = url.searchParams.get("cycleId") ?? undefined;
  const batchId = url.searchParams.get("batchId") ?? undefined;
  const courseId = url.searchParams.get("courseId") ?? undefined;

  if (!action) {
    return NextResponse.json({ error: "action query parameter is required" }, { status: 400 });
  }

  if (!(ALL_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  // Scoped actions require scope params
  if ((action === "clear-sessions" || action === "clear-teams" || action === "reset-course") &&
      (!cycleId || !batchId || !courseId)) {
    return NextResponse.json(
      { error: `${action} requires cycleId, batchId, and courseId` },
      { status: 400 },
    );
  }

  try {
    switch (action) {
      // ── Zone 1: Cycle Management ─────────────────────────────────────────────

      case "delete-all-cycles": {
        // Must delete dependents first (onDelete: Restrict on cycle FK)
        const [g, p, s, t] = await db.$transaction([
          db.gradeRecord.deleteMany({}),
          db.sessionRoleMapping.deleteMany({}),
          db.sessionPlan.deleteMany({}),
          db.team.deleteMany({}),      // cascades TeamMembers + Assignments
        ]);
        const c = await db.academicCycle.deleteMany({});
        return NextResponse.json({ deleted: c.count + g.count + p.count + s.count + t.count,
          target: "cycles", scope: "all", detail: { cycles: c.count, sessions: s.count, teams: t.count } });
      }

      // ── Zone 2: Session & Schedule Cleanup ──────────────────────────────────

      case "clear-sessions": {
        const result = await db.sessionPlan.deleteMany({
          where: { cycleId, batchId, courseId },
        });
        return NextResponse.json({ deleted: result.count, target: "sessions", scope: "course" });
      }

      case "clear-all-sessions": {
        const result = await db.sessionPlan.deleteMany({});
        return NextResponse.json({ deleted: result.count, target: "sessions", scope: "all" });
      }

      case "clear-all-grades": {
        const result = await db.gradeRecord.deleteMany({});
        return NextResponse.json({ deleted: result.count, target: "grades", scope: "all" });
      }

      // ── Zone 3: Team & Pairing Cleanup ──────────────────────────────────────

      case "clear-teams": {
        const result = await db.team.deleteMany({
          where: { cycleId, batchId, courseId },
        });
        return NextResponse.json({ deleted: result.count, target: "teams", scope: "course" });
      }

      case "clear-all-teams": {
        const result = await db.team.deleteMany({});
        return NextResponse.json({ deleted: result.count, target: "teams", scope: "all" });
      }

      case "clear-all-pairings": {
        const result = await db.sessionRoleMapping.deleteMany({});
        return NextResponse.json({ deleted: result.count, target: "pairings", scope: "all" });
      }

      // ── Zone 4: Nuclear Options ─────────────────────────────────────────────

      case "reset-course": {
        // Find sessions for this scope to cascade grade/mapping deletes
        const sessions = await db.sessionPlan.findMany({
          where: { cycleId, batchId, courseId },
          select: { id: true },
        });
        const sessionIds = sessions.map((s) => s.id);

        const [g, p] = await db.$transaction([
          db.gradeRecord.deleteMany({ where: { sessionPlanId: { in: sessionIds } } }),
          db.sessionRoleMapping.deleteMany({ where: { sessionPlanId: { in: sessionIds } } }),
        ]);
        const [s, t] = await db.$transaction([
          db.sessionPlan.deleteMany({ where: { cycleId, batchId, courseId } }),
          db.team.deleteMany({ where: { cycleId, batchId, courseId } }),
        ]);
        return NextResponse.json({
          deleted: g.count + p.count + s.count + t.count,
          target: "course", scope: "course",
          detail: { grades: g.count, pairings: p.count, sessions: s.count, teams: t.count },
        });
      }

      case "wipe-all-data": {
        const [g, p, s, t] = await db.$transaction([
          db.gradeRecord.deleteMany({}),
          db.sessionRoleMapping.deleteMany({}),
          db.sessionPlan.deleteMany({}),
          db.team.deleteMany({}),
        ]);
        const c = await db.academicCycle.deleteMany({});
        return NextResponse.json({
          deleted: g.count + p.count + s.count + t.count + c.count,
          target: "all", scope: "all",
          detail: { cycles: c.count, grades: g.count, pairings: p.count, sessions: s.count, teams: t.count },
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[admin/cleanup] error:", err);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
