import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { evaluateCycleReportGate } from "@/lib/reports/cycleGate";

type RouteContext = {
  params: Promise<{ cycleId: string }>;
};

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(lines: string[]): string {
  const escapedLines = lines.map((line) => escapePdfText(line));
  const contentLines = escapedLines.map((line, index) => `BT /F1 11 Tf 50 ${780 - index * 18} Td (${line}) Tj ET`);
  const content = contentLines.join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n");
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");
  objects.push(`5 0 obj\n<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream\nendobj\n`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

export async function GET(_request: Request, context: RouteContext) {
  const { cycleId } = await context.params;

  const [cycle, gate, latestSnapshot] = await Promise.all([
    db.academicCycle.findUnique({
      where: { id: cycleId },
      select: {
        id: true,
        name: true,
        academicYear: true,
        semesterLabel: true,
        status: true,
      },
    }),
    evaluateCycleReportGate(cycleId),
    db.reportSnapshot.findFirst({
      where: { cycleId },
      orderBy: { generatedAt: "desc" },
      select: { id: true, status: true, generatedAt: true },
    }),
  ]);

  if (!cycle) {
    return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  }

  const lines = [
    "SAM Progress Report Snapshot",
    `Cycle: ${cycle.name}`,
    `Academic Year: ${cycle.academicYear}`,
    `Semester: ${cycle.semesterLabel}`,
    `Cycle Status: ${cycle.status}`,
    `Gate Status: ${gate.allowed ? "OPEN" : "BLOCKED"}`,
    `Total Sessions: ${gate.totalSessions}`,
    `Completed Sessions: ${gate.completedSessions}`,
    `Remaining Sessions: ${gate.remainingSessions}`,
    `Snapshot ID: ${latestSnapshot?.id ?? "N/A"}`,
    `Snapshot Generated: ${latestSnapshot?.generatedAt?.toISOString() ?? "N/A"}`,
    `Exported At: ${new Date().toISOString()}`,
  ];

  const pdf = buildSimplePdf(lines);
  const blob = new Blob([pdf], { type: "application/pdf" });

  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sam-report-${cycleId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
