-- AlterTable
ALTER TABLE "AlumniMentor" ALTER COLUMN "expertise" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "assignType" TEXT,
ADD COLUMN     "bloomLevel" INTEGER,
ADD COLUMN     "isReserve" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "learningObjectives" TEXT[],
ADD COLUMN     "sessionSlot" INTEGER,
ADD COLUMN     "unit" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "shuffleIndex" INTEGER;
