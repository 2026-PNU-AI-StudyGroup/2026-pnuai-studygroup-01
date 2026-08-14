ALTER TABLE "project_program"
RENAME COLUMN "isPublic" TO "isStudentPublic";

ALTER TABLE "project_program"
ADD COLUMN "isFacultyPublic" BOOLEAN NOT NULL DEFAULT false;

UPDATE "project_program"
SET "isFacultyPublic" = "isStudentPublic";

DROP INDEX IF EXISTS "project_program_isPublic_startsAt_endsAt_idx";

CREATE INDEX "project_program_isStudentPublic_startsAt_endsAt_idx"
ON "project_program"("isStudentPublic", "startsAt", "endsAt");

CREATE INDEX "project_program_isFacultyPublic_startsAt_endsAt_idx"
ON "project_program"("isFacultyPublic", "startsAt", "endsAt");
