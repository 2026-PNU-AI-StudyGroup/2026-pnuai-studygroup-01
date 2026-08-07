ALTER TABLE "project_program"
ADD COLUMN "recruitmentEndsAt" TIMESTAMP(3);

UPDATE "project_program"
SET "recruitmentEndsAt" = "endsAt"
WHERE "recruitmentEndsAt" IS NULL;

ALTER TABLE "project_program"
ALTER COLUMN "recruitmentEndsAt" SET NOT NULL,
ADD CONSTRAINT "project_program_recruitment_deadline_within_period"
CHECK ("recruitmentEndsAt" >= "startsAt" AND "recruitmentEndsAt" <= "endsAt");

ALTER TABLE "topic"
DROP CONSTRAINT "topic_recruitment_period_valid",
DROP COLUMN "recruitmentEndsAt";

ALTER TYPE "AuditAction" ADD VALUE 'TOPIC_RECRUITMENT_CLOSED';
