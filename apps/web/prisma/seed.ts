import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { PrismaClient, SessionRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

type DeptMeta = Record<string, { name?: string }>;
type Course = { code: string; name: string; credits: number; units?: string[] };
type Syllabus = Record<string, Record<string, Record<string, Course[]>>>;
type RubricDim = { name: string; desc?: string; anchor?: string };
type RubricDef = { label?: string; dims?: Array<string | { name?: string; desc?: string; anchor?: string }> };
type Rubrics = Record<string, RubricDef>;

let prismaClient: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Configure apps/web/.env before running db:seed.");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
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

function normalizeRubricDims(def?: RubricDef): RubricDim[] {
  const dims = def?.dims ?? [];
  return dims.map((d) => {
    if (typeof d === "string") return { name: d };
    return {
      name: d.name ?? "Unnamed Dimension",
      desc: d.desc,
      anchor: d.anchor,
    };
  });
}

function parseSemester(semKey: string): number {
  return Number.parseInt(semKey.replace(/[^0-9]/g, ""), 10);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const refFile = resolveReferenceFile();
  const html = fs.readFileSync(refFile, "utf8");

  const deptMeta = evalObject<DeptMeta>(extractConstExpression(html, "DEPTMETA"), "DEPTMETA");
  const syllabus = evalObject<Syllabus>(extractConstExpression(html, "SYLLABUS"), "SYLLABUS");
  const rubrics = evalObject<Rubrics>(extractConstExpression(html, "RUBRICS"), "RUBRICS");

  const departments = Object.entries(deptMeta).map(([id, meta]) => ({
    id,
    name: meta?.name ?? id,
  }));

  const courses: Array<{
    departmentId: string;
    regulation: string;
    semester: number;
    code: string;
    name: string;
    credits: number;
  }> = [];

  for (const [deptCode, regs] of Object.entries(syllabus)) {
    for (const [reg, sems] of Object.entries(regs)) {
      if (reg === "NOTE") continue;
      for (const [semKey, semCourses] of Object.entries(sems)) {
        const semester = parseSemester(semKey);
        for (const c of semCourses) {
          courses.push({
            departmentId: deptCode,
            regulation: reg,
            semester,
            code: c.code,
            name: c.name,
            credits: c.credits,
          });
        }
      }
    }
  }

  const rubricEntries = [
    { key: "P", role: SessionRole.PRESENTER, defaultLabel: "Presenter Rubric" },
    { key: "TR", role: SessionRole.TECHNICAL_REVIEWER, defaultLabel: "Technical Reviewer Rubric" },
    { key: "FP", role: SessionRole.FEEDBACK_STRATEGIST, defaultLabel: "Feedback Strategist Rubric" },
  ].map(({ key, role, defaultLabel }) => ({
    role,
    name: rubrics[key]?.label ?? defaultLabel,
    dimensions: normalizeRubricDims(rubrics[key]),
  }));

  const alumniMentors = [
    {
      fullName: "Arun Prakash",
      graduationYear: 2019,
      branch: "Computer Science Engineering",
      organization: "Zoho Corporation",
      roleTitle: "Senior Software Engineer",
      expertise: ["Backend Systems", "System Design", "Career Mentoring"],
      profileSummary: "Supports students in building software engineering fundamentals and interview readiness.",
      email: null,
      linkedInUrl: null,
      isActive: true,
      departmentId: "CSE",
    },
    {
      fullName: "Nivetha R",
      graduationYear: 2020,
      branch: "Electronics & Communication Engineering",
      organization: "Texas Instruments",
      roleTitle: "Embedded Engineer",
      expertise: ["Embedded C", "Microcontrollers", "Product Development"],
      profileSummary: "Mentors on embedded systems projects and practical hardware-software integration.",
      email: null,
      linkedInUrl: null,
      isActive: true,
      departmentId: "ECE",
    },
    {
      fullName: "Karthik S",
      graduationYear: 2018,
      branch: "Mechanical Engineering",
      organization: "Ashok Leyland",
      roleTitle: "Design Engineer",
      expertise: ["CAD", "Manufacturing", "Project Reviews"],
      profileSummary: "Guides students in applying design and manufacturing concepts to capstone projects.",
      email: null,
      linkedInUrl: null,
      isActive: true,
      departmentId: "MCE",
    },
  ];

  if (dryRun) {
    console.log("[seed:dry-run] Parsed constants from:", refFile);
    console.log("[seed:dry-run] Departments:", departments.length);
    console.log("[seed:dry-run] Courses:", courses.length);
    console.log("[seed:dry-run] Rubrics:", rubricEntries.length);
    return;
  }

  prismaClient = createPrismaClient();

  for (const dept of departments) {
    await prismaClient.department.upsert({
      where: { id: dept.id },
      update: { name: dept.name },
      create: dept,
    });
  }

  for (const course of courses) {
    await prismaClient.course.upsert({
      where: {
        departmentId_regulation_semester_code: {
          departmentId: course.departmentId,
          regulation: course.regulation,
          semester: course.semester,
          code: course.code,
        },
      },
      update: {
        name: course.name,
        credits: course.credits,
      },
      create: course,
    });
  }

  for (const rubric of rubricEntries) {
    const existing = await prismaClient.rubric.findFirst({
      where: {
        role: rubric.role,
        version: 1,
        name: rubric.name,
      },
    });

    if (existing) {
      await prismaClient.rubric.update({
        where: { id: existing.id },
        data: {
          dimensions: rubric.dimensions,
          isActive: true,
        },
      });
    } else {
      await prismaClient.rubric.create({
        data: {
          role: rubric.role,
          name: rubric.name,
          version: 1,
          dimensions: rubric.dimensions,
          isActive: true,
        },
      });
    }
  }

  for (const mentor of alumniMentors) {
    const existing = await prismaClient.alumniMentor.findFirst({
      where: {
        fullName: mentor.fullName,
        graduationYear: mentor.graduationYear,
      },
      select: { id: true },
    });

    if (existing) {
      await prismaClient.alumniMentor.update({
        where: { id: existing.id },
        data: mentor,
      });
    } else {
      await prismaClient.alumniMentor.create({
        data: mentor,
      });
    }
  }

  const cycleCount = await prismaClient.academicCycle.count();
  if (cycleCount === 0) {
    await prismaClient.academicCycle.create({
      data: {
        name: "Cycle 1",
        academicYear: "2025-26",
        semesterLabel: "Even Semester",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-06-30T00:00:00.000Z"),
        status: "DRAFT",
      },
    });
  }

  console.log("[seed] Departments upserted:", departments.length);
  console.log("[seed] Courses upserted:", courses.length);
  console.log("[seed] Rubrics upserted:", rubricEntries.length);
  console.log("[seed] Alumni mentors upserted:", alumniMentors.length);
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect();
    }
  });
