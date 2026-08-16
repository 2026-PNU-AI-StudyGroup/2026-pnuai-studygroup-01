ALTER TABLE "project_program"
  DROP CONSTRAINT IF EXISTS "project_program_schedule_within_operation_check";

ALTER TABLE "project_program"
  ADD CONSTRAINT "project_program_schedule_within_operation_check" CHECK (
    "projectRegistrationStartsAt" >= "startsAt"
    AND "projectRegistrationEndsAt" <= "endsAt"
    AND (
      (
        "recruitmentStartsAt" IS NULL
        AND "recruitmentEndsAt" IS NULL
      )
      OR (
        "recruitmentStartsAt" IS NOT NULL
        AND "recruitmentEndsAt" IS NOT NULL
        AND "recruitmentStartsAt" >= "startsAt"
        AND "recruitmentEndsAt" <= "endsAt"
      )
    )
    AND "executionStartsAt" >= "startsAt"
    AND "executionEndsAt" <= "endsAt"
  );
