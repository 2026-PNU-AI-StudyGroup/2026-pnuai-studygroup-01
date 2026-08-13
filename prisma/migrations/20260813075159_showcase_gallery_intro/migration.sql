-- AlterEnum
ALTER TYPE "ArtifactType" ADD VALUE 'IMAGE';

-- AlterTable
ALTER TABLE "artifact" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "program_track" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "team" ADD COLUMN     "showcaseIntro" TEXT;
