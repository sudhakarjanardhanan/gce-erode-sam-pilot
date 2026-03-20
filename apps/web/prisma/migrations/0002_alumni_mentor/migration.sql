-- Add ALUMNI to user role enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ALUMNI';

-- Create alumni mentor directory table
CREATE TABLE "AlumniMentor" (
	"id" TEXT NOT NULL,
	"fullName" TEXT NOT NULL,
	"graduationYear" INTEGER NOT NULL,
	"branch" TEXT NOT NULL,
	"organization" TEXT,
	"roleTitle" TEXT,
	"expertise" TEXT[] DEFAULT ARRAY[]::TEXT[],
	"profileSummary" TEXT,
	"email" TEXT,
	"linkedInUrl" TEXT,
	"isActive" BOOLEAN NOT NULL DEFAULT true,
	"departmentId" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "AlumniMentor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlumniMentor_departmentId_idx" ON "AlumniMentor"("departmentId");
CREATE INDEX "AlumniMentor_isActive_idx" ON "AlumniMentor"("isActive");
CREATE INDEX "AlumniMentor_graduationYear_idx" ON "AlumniMentor"("graduationYear");

ALTER TABLE "AlumniMentor"
ADD CONSTRAINT "AlumniMentor_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
