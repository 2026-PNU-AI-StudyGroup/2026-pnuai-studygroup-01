ALTER TABLE "student_team_recruitment_post"
ADD COLUMN IF NOT EXISTS "deadlineAt" TIMESTAMP(3);

UPDATE "student_team_recruitment_post"
SET "deadlineAt" = "createdAt" + INTERVAL '1 month'
WHERE "deadlineAt" IS NULL
   OR "deadlineAt" <= "createdAt"
   OR "deadlineAt" > "createdAt" + INTERVAL '1 month';

ALTER TABLE "student_team_recruitment_post"
ALTER COLUMN "deadlineAt" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_team_recruitment_post_deadline_valid'
  ) THEN
    ALTER TABLE "student_team_recruitment_post"
    ADD CONSTRAINT "student_team_recruitment_post_deadline_valid"
      CHECK (
        "deadlineAt" > "createdAt"
        AND "deadlineAt" <= "createdAt" + INTERVAL '1 month'
      );
  END IF;
END $$;

DROP INDEX IF EXISTS "student_team_recruitment_post_status_createdAt_idx";

CREATE INDEX IF NOT EXISTS "student_team_recruitment_post_status_deadlineAt_idx"
ON "student_team_recruitment_post"("status", "deadlineAt");
