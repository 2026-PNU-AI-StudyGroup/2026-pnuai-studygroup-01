ALTER TABLE "project_program"
  ADD COLUMN "recruitmentStartsAt" TIMESTAMP(3),
  ADD COLUMN "executionStartsAt" TIMESTAMP(3),
  ADD COLUMN "executionEndsAt" TIMESTAMP(3),
  ADD COLUMN "submissionStartsAt" TIMESTAMP(3),
  ADD COLUMN "submissionEndsAt" TIMESTAMP(3);

WITH "topic_schedule" AS (
  SELECT
    "programId",
    MIN("recruitmentStartsAt") AS "recruitmentStartsAt",
    MIN("executionStartsAt") AS "executionStartsAt",
    MAX("executionEndsAt") AS "executionEndsAt",
    MIN("submissionStartsAt") AS "submissionStartsAt",
    MAX("submissionEndsAt") AS "submissionEndsAt"
  FROM "topic"
  GROUP BY "programId"
)
UPDATE "project_program" AS "program"
SET
  "recruitmentStartsAt" = COALESCE("topic_schedule"."recruitmentStartsAt", "program"."startsAt"),
  "executionStartsAt" = COALESCE("topic_schedule"."executionStartsAt", "program"."startsAt"),
  "executionEndsAt" = COALESCE("topic_schedule"."executionEndsAt", "program"."endsAt"),
  "submissionStartsAt" = COALESCE("topic_schedule"."submissionStartsAt", "program"."startsAt"),
  "submissionEndsAt" = COALESCE("topic_schedule"."submissionEndsAt", "program"."endsAt")
FROM "topic_schedule"
WHERE "program"."id" = "topic_schedule"."programId";

UPDATE "project_program"
SET
  "recruitmentStartsAt" = "startsAt",
  "recruitmentEndsAt" = "endsAt",
  "executionStartsAt" = "startsAt",
  "executionEndsAt" = "endsAt",
  "submissionStartsAt" = "startsAt",
  "submissionEndsAt" = "endsAt"
WHERE NOT EXISTS (
  SELECT 1 FROM "topic" WHERE "topic"."programId" = "project_program"."id"
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "project_program"
    WHERE "projectRegistrationStartsAt" < "startsAt"
       OR "projectRegistrationEndsAt" > "endsAt"
       OR "recruitmentStartsAt" >= "recruitmentEndsAt"
       OR "executionStartsAt" >= "executionEndsAt"
       OR "submissionStartsAt" >= "submissionEndsAt"
       OR "recruitmentStartsAt" < "startsAt"
       OR "recruitmentEndsAt" > "endsAt"
       OR "executionStartsAt" < "startsAt"
       OR "executionEndsAt" > "endsAt"
       OR "submissionStartsAt" < "startsAt"
       OR "submissionEndsAt" > "endsAt"
  ) THEN
    RAISE EXCEPTION 'Cannot migrate invalid program schedules';
  END IF;
END $$;

ALTER TABLE "project_program"
  ALTER COLUMN "recruitmentStartsAt" SET NOT NULL,
  ALTER COLUMN "executionStartsAt" SET NOT NULL,
  ALTER COLUMN "executionEndsAt" SET NOT NULL,
  ALTER COLUMN "submissionStartsAt" SET NOT NULL,
  ALTER COLUMN "submissionEndsAt" SET NOT NULL,
  ADD CONSTRAINT "project_program_recruitment_period_check" CHECK ("recruitmentStartsAt" < "recruitmentEndsAt"),
  ADD CONSTRAINT "project_program_execution_period_check" CHECK ("executionStartsAt" < "executionEndsAt"),
  ADD CONSTRAINT "project_program_submission_period_check" CHECK ("submissionStartsAt" < "submissionEndsAt"),
  ADD CONSTRAINT "project_program_schedule_within_operation_check" CHECK (
    "projectRegistrationStartsAt" >= "startsAt"
    AND "projectRegistrationEndsAt" <= "endsAt"
    AND
    "recruitmentStartsAt" >= "startsAt"
    AND "recruitmentEndsAt" <= "endsAt"
    AND "executionStartsAt" >= "startsAt"
    AND "executionEndsAt" <= "endsAt"
    AND "submissionStartsAt" >= "startsAt"
    AND "submissionEndsAt" <= "endsAt"
  );

ALTER TABLE "topic"
  DROP COLUMN "recruitmentStartsAt",
  DROP COLUMN "executionStartsAt",
  DROP COLUMN "executionEndsAt",
  DROP COLUMN "submissionStartsAt",
  DROP COLUMN "submissionEndsAt";
