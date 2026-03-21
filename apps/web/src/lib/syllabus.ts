import { readFile } from "node:fs/promises";
import { join } from "node:path";

const SYLLABUS_DIR = join(process.cwd(), "..", "..", "docs", "syllabus");

// Department code → syllabus filename mapping
const DEPT_FILES: Record<string, string> = {
  CSE: "CSE.md",
  ECE: "ECE.md",
  EEE: "EEE.md",
  MCE: "MCE.md",
  ATE: "ATE.md",
  IMT: "IMT.md",
  DSC: "DSC.md",
  CVE: "CVE.md",
};

/**
 * Parse syllabus units for a specific course code from the department markdown file.
 * Returns an array of unit topic strings, e.g. ["Matrices", "Differential Calculus", ...].
 */
export async function getUnitsForCourse(
  departmentId: string,
  courseCode: string,
): Promise<string[]> {
  const fileName = DEPT_FILES[departmentId.toUpperCase()];
  if (!fileName) return [];

  try {
    const content = await readFile(join(SYLLABUS_DIR, fileName), "utf-8");
    const lines = content.split("\n");

    // Find the course header: "#### CODE - Name (N credits)"
    const headerIdx = lines.findIndex((line) =>
      line.match(new RegExp(`^####\\s+${escapeRegex(courseCode)}\\s*-`)),
    );
    if (headerIdx < 0) return [];

    const units: string[] = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      // Stop at next course header or section header
      if (line.match(/^#{1,4}\s/)) break;
      // Match "- Unit N: Topic Name"
      const m = line.match(/^-\s+Unit\s+\d+:\s*(.+)/i);
      if (m) units.push(m[1].trim());
    }
    return units;
  } catch {
    return [];
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
