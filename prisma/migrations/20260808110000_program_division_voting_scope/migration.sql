-- Preserve the already-deployed program_track storage while replacing the loose topic FK.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "topic" t
    JOIN "program_track" d ON d."id" = t."trackId"
    WHERE t."trackId" IS NOT NULL AND t."programId" <> d."programId"
  ) THEN
    RAISE EXCEPTION 'topic.trackId must belong to the same project program';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "program_track"
    GROUP BY "programId", "position"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'program_track positions must be unique within a project program';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "program_track"
    GROUP BY "programId", lower("name")
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'program_track names must be unique ignoring case within a project program';
  END IF;
END $$;

ALTER TABLE "program_track" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "program_track" ADD CONSTRAINT "program_track_id_programId_key" UNIQUE ("id", "programId");
ALTER TABLE "program_track" ADD CONSTRAINT "program_track_programId_position_key" UNIQUE ("programId", "position");
CREATE UNIQUE INDEX "program_track_program_name_lower_key" ON "program_track" ("programId", lower("name"));

ALTER TABLE "topic" DROP CONSTRAINT "topic_trackId_fkey";
ALTER TABLE "topic" ADD CONSTRAINT "topic_trackId_programId_fkey"
  FOREIGN KEY ("trackId", "programId") REFERENCES "program_track"("id", "programId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "topic_programId_trackId_idx" ON "topic"("programId", "trackId");

CREATE TYPE "VoteLimitScope" AS ENUM ('PROGRAM', 'DIVISION');
ALTER TABLE "program_voting_policy" ADD COLUMN "voteLimitScope" "VoteLimitScope" NOT NULL DEFAULT 'PROGRAM';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROGRAM_DIVISION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROGRAM_DIVISION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROGRAM_DIVISION_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROGRAM_VOTING_RESET';
