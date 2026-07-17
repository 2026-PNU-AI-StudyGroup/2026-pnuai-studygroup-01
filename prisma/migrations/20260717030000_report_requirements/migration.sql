ALTER TYPE "AuditAction" ADD VALUE 'REPORT_REQUIREMENT_SET';
ALTER TYPE "AuditAction" ADD VALUE 'REPORT_REQUIREMENT_REMOVED';

ALTER TABLE "report" ADD COLUMN "dueAt" TIMESTAMP(3);

UPDATE "report"
SET "dueAt" = "topic"."submissionEndsAt"
FROM "team"
JOIN "topic" ON "topic"."id" = "team"."topicId"
WHERE "report"."teamId" = "team"."id";

ALTER TABLE "report" ALTER COLUMN "dueAt" SET NOT NULL;

CREATE INDEX "report_teamId_dueAt_idx" ON "report"("teamId", "dueAt");
