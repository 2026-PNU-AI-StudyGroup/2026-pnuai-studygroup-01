-- Program visibility is now one policy for every authenticated non-admin role.
-- Preserve access conservatively: a program was already public only when both
-- audience-specific flags were enabled. Partially public programs become
-- administrator-only until an administrator explicitly publishes them again.
ALTER TABLE "project_program"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

UPDATE "project_program"
SET "isPublic" = "isStudentPublic" AND "isFacultyPublic";

DROP INDEX IF EXISTS "project_program_isStudentPublic_startsAt_endsAt_idx";
DROP INDEX IF EXISTS "project_program_isFacultyPublic_startsAt_endsAt_idx";

ALTER TABLE "project_program"
DROP COLUMN "isStudentPublic",
DROP COLUMN "isFacultyPublic";

CREATE INDEX "project_program_isPublic_startsAt_endsAt_idx"
ON "project_program"("isPublic", "startsAt", "endsAt");
