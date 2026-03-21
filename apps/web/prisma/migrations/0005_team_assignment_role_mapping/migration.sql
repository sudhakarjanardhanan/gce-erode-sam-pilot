-- Team generation + assignment generation + session role mapping

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('GENERATED', 'PUBLISHED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "memberIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'GENERATED',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionRoleMapping" (
    "id" TEXT NOT NULL,
    "sessionPlanId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" "SessionRole" NOT NULL,
    "mappedBy" TEXT,
    "mappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionRoleMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_cycleId_batchId_courseId_name_key" ON "Team"("cycleId", "batchId", "courseId", "name");

-- CreateIndex
CREATE INDEX "Team_cycleId_batchId_courseId_idx" ON "Team"("cycleId", "batchId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_studentId_key" ON "TeamMember"("teamId", "studentId");

-- CreateIndex
CREATE INDEX "TeamMember_studentId_idx" ON "TeamMember"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_cycleId_teamId_title_key" ON "Assignment"("cycleId", "teamId", "title");

-- CreateIndex
CREATE INDEX "Assignment_cycleId_batchId_courseId_idx" ON "Assignment"("cycleId", "batchId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionRoleMapping_sessionPlanId_teamId_role_key" ON "SessionRoleMapping"("sessionPlanId", "teamId", "role");

-- CreateIndex
CREATE INDEX "SessionRoleMapping_sessionPlanId_idx" ON "SessionRoleMapping"("sessionPlanId");

-- CreateIndex
CREATE INDEX "SessionRoleMapping_studentId_idx" ON "SessionRoleMapping"("studentId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AcademicCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "AcademicCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRoleMapping" ADD CONSTRAINT "SessionRoleMapping_sessionPlanId_fkey" FOREIGN KEY ("sessionPlanId") REFERENCES "SessionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRoleMapping" ADD CONSTRAINT "SessionRoleMapping_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRoleMapping" ADD CONSTRAINT "SessionRoleMapping_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
