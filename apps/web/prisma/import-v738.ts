import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type BatchInfo = Record<string, { label: string; year: number; sem: string; sems?: string[] }>;
type BatchStudent = { id?: string; roll?: string; name?: string; email?: string };
type BatchMap = Record<string, Record<string, BatchStudent[]>>;
type FacultyRow = { name?: string; dept?: string; email?: string };

let prismaClient: PrismaClient | null = null;

function readDatabaseUrlFromEnvFile(): string | null {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "apps/web/.env"),
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const text = fs.readFileSync(envPath, "utf8");
    const line = text.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
    if (!line) {
      continue;
    }

    const value = line.replace(/^DATABASE_URL=/, "").trim().replace(/^"|"$/g, "");
    if (value) {
      return value;
    }
  }

  return null;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? readDatabaseUrlFromEnvFile();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Configure apps/web/.env before running this import.");
  }

  const pool = new Pool({ connectionString });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);
  return new PrismaClient({ adapter });
}

function resolveReferenceFile(): string {
  const candidates = [
    path.resolve(process.cwd(), "reference/sam_platform_v738_production.html"),
    path.resolve(process.cwd(), "../../reference/sam_platform_v738_production.html"),
  ];

  const match = candidates.find((p) => fs.existsSync(p));
  if (!match) {
    throw new Error("reference/sam_platform_v738_production.html not found");
  }
  return match;
}

function extractConstExpression(source: string, constName: string): string {
  const marker = `const ${constName}`;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Constant ${constName} not found in reference file`);
  }

  const eq = source.indexOf("=", start);
  if (eq === -1) {
    throw new Error(`Constant ${constName} is malformed (missing '=')`);
  }

  let i = eq + 1;
  while (i < source.length && /\s/.test(source[i])) i += 1;

  let depth = 0;
  let inString: '"' | "'" | "`" | null = null;
  let escaped = false;
  let end = -1;

  for (let j = i; j < source.length; j += 1) {
    const ch = source[j];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "{" || ch === "[" || ch === "(") depth += 1;
    if (ch === "}" || ch === "]" || ch === ")") depth -= 1;

    if (ch === ";" && depth === 0) {
      end = j;
      break;
    }
  }

  if (end === -1) {
    throw new Error(`Could not find end of constant ${constName}`);
  }

  return source.slice(i, end).trim();
}

function evalObject<T>(expr: string, constName: string): T {
  try {
    return vm.runInNewContext(`(${expr})`) as T;
  } catch (err) {
    throw new Error(`Failed to parse ${constName}: ${(err as Error).message}`);
  }
}

function parseSemester(semValue: string): number {
  const parsed = Number.parseInt(semValue.replace(/[^0-9]/g, ""), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    throw new Error(`Invalid semester value: ${semValue}`);
  }
  return parsed;
}

function normalizeEmail(value: string | undefined): string | null {
  const email = (value ?? "").trim();
  return email.length > 0 ? email : null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const refFile = resolveReferenceFile();
  const html = fs.readFileSync(refFile, "utf8");

  const batchInfo = evalObject<BatchInfo>(extractConstExpression(html, "BATCH_INFO"), "BATCH_INFO");
  const batches = evalObject<BatchMap>(extractConstExpression(html, "BATCHES"), "BATCHES");
  const facultyRows = evalObject<FacultyRow[]>(extractConstExpression(html, "FACULTY"), "FACULTY");

  prismaClient = createPrismaClient();

  const departments = await prismaClient.department.findMany({
    select: { id: true },
  });
  const knownDepartments = new Set(departments.map((d) => d.id));

  const batchPayload: Array<{
    departmentId: string;
    label: string;
    year: number;
    semester: number;
    regulation: string;
  }> = [];

  for (const [batchLabel, deptMap] of Object.entries(batches)) {
    const info = batchInfo[batchLabel];
    if (!info) {
      continue;
    }

    const semester = parseSemester(info.sem);
    const yearValue = Number.parseInt(batchLabel, 10);
    const regulation = `R${yearValue - 4}`;

    for (const deptCode of Object.keys(deptMap)) {
      if (!knownDepartments.has(deptCode)) {
        continue;
      }

      batchPayload.push({
        departmentId: deptCode,
        label: batchLabel,
        year: info.year,
        semester,
        regulation,
      });
    }
  }

  if (dryRun) {
    let totalStudents = 0;
    for (const [batchLabel, deptMap] of Object.entries(batches)) {
      for (const [deptCode, students] of Object.entries(deptMap)) {
        if (!knownDepartments.has(deptCode) || !batchInfo[batchLabel]) {
          continue;
        }
        totalStudents += students.length;
      }
    }

    const validFaculty = facultyRows.filter((f) => {
      const dept = (f.dept ?? "").trim();
      return dept.length > 0 && knownDepartments.has(dept);
    });

    console.log("[import-v738:dry-run] Parsed constants from:", refFile);
    console.log("[import-v738:dry-run] Batches to upsert:", batchPayload.length);
    console.log("[import-v738:dry-run] Students to upsert:", totalStudents);
    console.log("[import-v738:dry-run] Faculty to upsert:", validFaculty.length);
    return;
  }

  let batchUpserts = 0;
  for (const b of batchPayload) {
    await prismaClient.batch.upsert({
      where: {
        departmentId_year_semester_regulation_label: {
          departmentId: b.departmentId,
          year: b.year,
          semester: b.semester,
          regulation: b.regulation,
          label: b.label,
        },
      },
      update: {
        year: b.year,
        semester: b.semester,
        regulation: b.regulation,
      },
      create: b,
    });
    batchUpserts += 1;
  }

  const batchIndex = new Map<string, string>();
  const batchRows = await prismaClient.batch.findMany({
    select: {
      id: true,
      departmentId: true,
      label: true,
    },
  });
  for (const b of batchRows) {
    batchIndex.set(`${b.label}::${b.departmentId}`, b.id);
  }

  let studentUpserts = 0;
  for (const [batchLabel, deptMap] of Object.entries(batches)) {
    for (const [deptCode, students] of Object.entries(deptMap)) {
      const batchId = batchIndex.get(`${batchLabel}::${deptCode}`);
      if (!batchId) {
        continue;
      }

      for (const s of students) {
        const rollNumber = (s.id ?? s.roll ?? "").trim();
        const name = (s.name ?? "").trim();
        if (!rollNumber || !name) {
          continue;
        }

        await prismaClient.student.upsert({
          where: { rollNumber },
          update: {
            name,
            email: normalizeEmail(s.email),
            batchId,
          },
          create: {
            rollNumber,
            name,
            email: normalizeEmail(s.email),
            batchId,
          },
        });
        studentUpserts += 1;
      }
    }
  }

  const deptFacultyCounters = new Map<string, number>();
  let facultyUpserts = 0;

  for (const f of facultyRows) {
    const departmentId = (f.dept ?? "").trim();
    const name = (f.name ?? "").trim();
    if (!departmentId || !knownDepartments.has(departmentId) || !name) {
      continue;
    }

    const idx = (deptFacultyCounters.get(departmentId) ?? 0) + 1;
    deptFacultyCounters.set(departmentId, idx);

    const staffCode = `V738-${departmentId}-${String(idx).padStart(3, "0")}`;
    await prismaClient.faculty.upsert({
      where: { staffCode },
      update: {
        name,
        email: normalizeEmail(f.email),
        departmentId,
      },
      create: {
        staffCode,
        name,
        email: normalizeEmail(f.email),
        departmentId,
      },
    });
    facultyUpserts += 1;
  }

  const [batchCount, studentCount, facultyCount] = await Promise.all([
    prismaClient.batch.count(),
    prismaClient.student.count(),
    prismaClient.faculty.count(),
  ]);

  console.log("[import-v738] Batches upserted:", batchUpserts);
  console.log("[import-v738] Students upserted:", studentUpserts);
  console.log("[import-v738] Faculty upserted:", facultyUpserts);
  console.log("[import-v738] Totals now => batches:", batchCount, "students:", studentCount, "faculty:", facultyCount);
}

main()
  .catch((err) => {
    console.error("[import-v738] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect();
    }
  });
