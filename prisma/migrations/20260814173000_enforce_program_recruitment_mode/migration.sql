UPDATE "project_program"
SET
  "recruitmentStartsAt" = NULL,
  "recruitmentEndsAt" = NULL
WHERE "studentProjectCreationEnabled" = true;

ALTER TABLE "project_program"
  ADD CONSTRAINT "project_program_recruitment_mode_check"
  CHECK (
    (
      "studentProjectCreationEnabled" = true
      AND "recruitmentStartsAt" IS NULL
      AND "recruitmentEndsAt" IS NULL
    )
    OR (
      "studentProjectCreationEnabled" = false
      AND "recruitmentStartsAt" IS NOT NULL
      AND "recruitmentEndsAt" IS NOT NULL
    )
  );
