-- Project termination is derived only from project_program.endsAt and
-- project_team.confirmedAt. Topic keeps approval/publication state only.

ALTER TABLE "topic" DROP CONSTRAINT IF EXISTS "topic_terminal_state_check";
ALTER TABLE "topic" DROP CONSTRAINT IF EXISTS "topic_cancellation_reason_check";

CREATE TYPE "TopicStatus_approval" AS ENUM ('PENDING_APPROVAL', 'REJECTED', 'ACTIVE');
ALTER TABLE "topic" ADD COLUMN "status_approval" "TopicStatus_approval";
UPDATE "topic"
SET "status_approval" = CASE
  WHEN "status"::text = 'PENDING_APPROVAL' THEN 'PENDING_APPROVAL'
  WHEN "status"::text = 'REJECTED' THEN 'REJECTED'
  ELSE 'ACTIVE'
END::"TopicStatus_approval";
ALTER TABLE "topic" ALTER COLUMN "status_approval" SET NOT NULL;
DROP INDEX IF EXISTS "topic_programId_status_idx";
DROP INDEX IF EXISTS "topic_managerId_status_idx";
ALTER TABLE "topic" DROP COLUMN "status";
ALTER TABLE "topic" RENAME COLUMN "status_approval" TO "status";
DROP TYPE "TopicStatus";
ALTER TYPE "TopicStatus_approval" RENAME TO "TopicStatus";
CREATE INDEX "topic_programId_status_idx" ON "topic"("programId", "status");
CREATE INDEX "topic_managerId_status_idx" ON "topic"("managerId", "status");
ALTER TABLE "topic" DROP COLUMN "terminalAt";
ALTER TABLE "topic" DROP COLUMN "cancellationReason";

ALTER TABLE "project_program" ADD COLUMN "endProcessedAt" TIMESTAMP(3);
UPDATE "project_program"
SET "endProcessedAt" = COALESCE("closedAt", "updatedAt", "endsAt")
WHERE "lifecycleStatus" = 'CLOSED';
DROP INDEX IF EXISTS "project_program_lifecycleStatus_startsAt_endsAt_idx";
ALTER TABLE "project_program" DROP COLUMN "lifecycleStatus";
ALTER TABLE "project_program" DROP COLUMN "closedAt";
DROP TYPE "ProgramLifecycleStatus";
CREATE INDEX "project_program_endsAt_endProcessedAt_idx"
  ON "project_program"("endsAt", "endProcessedAt");
