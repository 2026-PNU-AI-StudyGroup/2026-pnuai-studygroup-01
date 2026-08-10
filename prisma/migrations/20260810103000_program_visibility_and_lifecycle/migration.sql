-- Public visibility and operational closure are independent program concerns.
CREATE TYPE "ProgramLifecycleStatus" AS ENUM ('ACTIVE', 'CLOSED');

ALTER TABLE "project_program"
  ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lifecycleStatus" "ProgramLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "project_program"
SET
  "isPublic" = "status" IN ('OPEN', 'CLOSED'),
  "lifecycleStatus" = CASE WHEN "status" = 'CLOSED' THEN 'CLOSED'::"ProgramLifecycleStatus" ELSE 'ACTIVE'::"ProgramLifecycleStatus" END;

ALTER TABLE "project_program"
  DROP COLUMN "openedAt",
  DROP COLUMN "status";

DROP TYPE "ProjectProgramStatus";

CREATE INDEX "project_program_lifecycleStatus_startsAt_endsAt_idx"
  ON "project_program"("lifecycleStatus", "startsAt", "endsAt");
CREATE INDEX "project_program_isPublic_startsAt_endsAt_idx"
  ON "project_program"("isPublic", "startsAt", "endsAt");
