-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'HOD', 'FACULTY', 'VIEWER');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'LOCKED');

-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('GENERATED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SessionRole" AS ENUM ('PRESENTER', 'TECHNICAL_REVIEWER', 'FEEDBACK_STRATEGIST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL,
    "staffCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "regulation" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "semester" INTEGER NOT NULL,
    "regulation" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicCycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "semesterLabel" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionPlan" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "blockIndex" INTEGER NOT NULL,
    "sessionIndex" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubric" (
    "id" TEXT NOT NULL,
    "role" "SessionRole" NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dimensions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricOverride" (
    "id" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "departmentId" TEXT,
    "courseId" TEXT,
    "dimensions" JSONB NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RubricOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeRecord" (
    "id" TEXT NOT NULL,
    "sessionPlanId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" "SessionRole" NOT NULL,
    "dimensionScores" JSONB NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "status" "GradeStatus" NOT NULL DEFAULT 'DRAFT',
    "gradedBy" TEXT,
    "gradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSnapshot" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "studentId" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATED',
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "ReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "RoleAssignment_userId_idx" ON "RoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "RoleAssignment_departmentId_idx" ON "RoleAssignment"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_staffCode_key" ON "Faculty"("staffCode");

-- CreateIndex
CREATE INDEX "Faculty_departmentId_idx" ON "Faculty"("departmentId");

-- CreateIndex
CREATE INDEX "Batch_departmentId_idx" ON "Batch"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_departmentId_year_semester_regulation_label_key" ON "Batch"("departmentId", "year", "semester", "regulation", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNumber_key" ON "Student"("rollNumber");

-- CreateIndex
CREATE INDEX "Student_batchId_idx" ON "Student"("batchId");

-- CreateIndex
CREATE INDEX "Course_departmentId_idx" ON "Course"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_departmentId_regulation_semester_code_key" ON "Course"("departmentId", "regulation", "semester", "code");

-- CreateIndex
CREATE INDEX "AcademicCycle_status_idx" ON "AcademicCycle"("status");

-- CreateIndex
CREATE INDEX "SessionPlan_cycleId_status_idx" ON "SessionPlan"("cycleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SessionPlan_cycleId_batchId_courseId_blockIndex_sessionInde_key" ON "SessionPlan"("cycleId", "batchId", "courseId", "blockIndex", "sessionIndex");

-- CreateIndex
CREATE INDEX "Rubric_role_isActive_idx" ON "Rubric"("role", "isActive");

-- CreateIndex
CREATE INDEX "RubricOverride_rubricId_idx" ON "RubricOverride"("rubricId");

-- CreateIndex
CREATE INDEX "GradeRecord_sessionPlanId_status_idx" ON "GradeRecord"("sessionPlanId", "status");

-- CreateIndex
CREATE INDEX "GradeRecord_studentId_idx" ON "GradeRecord"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeRecord_sessionPlanId_studentId_role_key" ON "GradeRecord"("sessionPlanId", "studentId", "role");

-- CreateIndex
CREATE INDEX "ReportSnapshot_cycleId_status_idx" ON "ReportSnapshot"("cycleId", "status");

-- CreateIndex
CREATE INDEX "ReportSnapshot_studentId_idx" ON "ReportSnapshot"("studentId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPlan" ADD CONSTRAINT "SessionPlan_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AcademicCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPlan" ADD CONSTRAINT "SessionPlan_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPlan" ADD CONSTRAINT "SessionPlan_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPlan" ADD CONSTRAINT "SessionPlan_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricOverride" ADD CONSTRAINT "RubricOverride_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricOverride" ADD CONSTRAINT "RubricOverride_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricOverride" ADD CONSTRAINT "RubricOverride_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRecord" ADD CONSTRAINT "GradeRecord_sessionPlanId_fkey" FOREIGN KEY ("sessionPlanId") REFERENCES "SessionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRecord" ADD CONSTRAINT "GradeRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSnapshot" ADD CONSTRAINT "ReportSnapshot_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AcademicCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

