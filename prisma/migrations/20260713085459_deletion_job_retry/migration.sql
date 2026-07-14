-- DropIndex
DROP INDEX "object_deletion_job_createdAt_idx";

-- AlterTable
ALTER TABLE "object_deletion_job" ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "object_deletion_job_nextAttemptAt_lockedAt_idx" ON "object_deletion_job"("nextAttemptAt", "lockedAt");
