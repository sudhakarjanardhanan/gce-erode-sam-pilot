-- Add registration status enum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Create registration intake table
CREATE TABLE "RegistrationRequest" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "departmentId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerNotes" TEXT,
    "userId" TEXT,
    CONSTRAINT "RegistrationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationRequest_role_status_idx" ON "RegistrationRequest"("role", "status");
CREATE INDEX "RegistrationRequest_email_idx" ON "RegistrationRequest"("email");
CREATE INDEX "RegistrationRequest_submittedAt_idx" ON "RegistrationRequest"("submittedAt");

ALTER TABLE "RegistrationRequest"
ADD CONSTRAINT "RegistrationRequest_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegistrationRequest"
ADD CONSTRAINT "RegistrationRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
