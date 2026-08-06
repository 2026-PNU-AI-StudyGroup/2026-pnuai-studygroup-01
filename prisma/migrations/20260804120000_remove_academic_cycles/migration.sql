BEGIN;

-- Fail before changing the schema when existing rows cannot satisfy the new
-- program-scoped contracts. Do not guess or discard conflicting data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "project_program"
    WHERE "startsAt" >= "endsAt"
  ) THEN
    RAISE EXCEPTION 'project_program contains rows whose startsAt is not before endsAt';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "project_program"
    GROUP BY "name", "startsAt"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'project_program contains duplicate (name, startsAt) values';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "topic" AS topic
    LEFT JOIN "project_program" AS program
      ON program."id" = topic."programId"
    WHERE program."id" IS NULL
       OR program."academicCycleId" IS DISTINCT FROM topic."academicCycleId"
  ) THEN
    RAISE EXCEPTION 'topic and project_program academic-cycle mappings are inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "team" AS team
    LEFT JOIN "topic" AS topic
      ON topic."id" = team."topicId"
    WHERE topic."id" IS NULL
       OR topic."academicCycleId" IS DISTINCT FROM team."academicCycleId"
       OR topic."managerId" IS DISTINCT FROM team."professorId"
  ) THEN
    RAISE EXCEPTION 'team and topic mappings are inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "team_member" AS member
    LEFT JOIN "team" AS team
      ON team."id" = member."teamId"
    WHERE team."id" IS NULL
       OR team."academicCycleId" IS DISTINCT FROM member."academicCycleId"
       OR team."topicId" IS DISTINCT FROM member."topicId"
  ) THEN
    RAISE EXCEPTION 'team_member and team mappings are inconsistent';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "team_member" AS member
    JOIN "team" AS team
      ON team."id" = member."teamId"
    JOIN "topic" AS topic
      ON topic."id" = team."topicId"
    GROUP BY topic."programId", member."studentId"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'team_member contains duplicate (programId, studentId) memberships';
  END IF;
END $$;

-- Propagate the stable program scope down the existing topic -> team -> member
-- chain before replacing any legacy academic-cycle foreign keys.
ALTER TABLE "team" ADD COLUMN "programId" TEXT;
ALTER TABLE "team_member" ADD COLUMN "programId" TEXT;

UPDATE "team" AS team
SET "programId" = topic."programId"
FROM "topic" AS topic
WHERE topic."id" = team."topicId";

UPDATE "team_member" AS member
SET "programId" = team."programId"
FROM "team" AS team
WHERE team."id" = member."teamId";

ALTER TABLE "team" ALTER COLUMN "programId" SET NOT NULL;
ALTER TABLE "team_member" ALTER COLUMN "programId" SET NOT NULL;

-- Establish all replacement checks, candidate keys, indexes, and foreign keys
-- while the legacy constraints still protect the source mappings.
ALTER TABLE "project_program"
ADD CONSTRAINT "project_program_period_valid"
CHECK ("startsAt" < "endsAt");

CREATE UNIQUE INDEX "project_program_name_startsAt_key"
ON "project_program"("name", "startsAt");

CREATE UNIQUE INDEX "topic_id_programId_managerId_key"
ON "topic"("id", "programId", "managerId");

CREATE UNIQUE INDEX "team_topicId_programId_professorId_key"
ON "team"("topicId", "programId", "professorId");

CREATE UNIQUE INDEX "team_id_programId_topicId_key"
ON "team"("id", "programId", "topicId");

CREATE INDEX "team_programId_status_idx"
ON "team"("programId", "status");

CREATE UNIQUE INDEX "team_member_programId_studentId_key"
ON "team_member"("programId", "studentId");

ALTER TABLE "topic"
ADD CONSTRAINT "topic_programId_fkey"
FOREIGN KEY ("programId") REFERENCES "project_program"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team"
ADD CONSTRAINT "team_topicId_programId_professorId_fkey"
FOREIGN KEY ("topicId", "programId", "professorId")
REFERENCES "topic"("id", "programId", "managerId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team_member"
ADD CONSTRAINT "team_member_teamId_programId_topicId_fkey"
FOREIGN KEY ("teamId", "programId", "topicId")
REFERENCES "team"("id", "programId", "topicId")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove dependent legacy constraints from the leaf tables upward. Keeping the
-- replacement constraints in place makes every subsequent column drop safe.
ALTER TABLE "team_member"
DROP CONSTRAINT "team_member_teamId_academicCycleId_topicId_fkey";

ALTER TABLE "team"
DROP CONSTRAINT "team_topicId_academicCycleId_professorId_fkey";

ALTER TABLE "topic"
DROP CONSTRAINT "topic_programId_academicCycleId_fkey",
DROP CONSTRAINT "topic_academicCycleId_fkey";

ALTER TABLE "project_program"
DROP CONSTRAINT "project_program_academicCycleId_fkey";

DROP INDEX "team_member_academicCycleId_studentId_key";
DROP INDEX "team_id_academicCycleId_topicId_key";
DROP INDEX "team_topicId_academicCycleId_professorId_key";
DROP INDEX "team_academicCycleId_status_idx";
DROP INDEX "topic_id_academicCycleId_managerId_key";
DROP INDEX "topic_academicCycleId_status_idx";
DROP INDEX "project_program_id_academicCycleId_key";
DROP INDEX "project_program_academicCycleId_name_key";

ALTER TABLE "team_member" DROP COLUMN "academicCycleId";
ALTER TABLE "team" DROP COLUMN "academicCycleId";
ALTER TABLE "topic" DROP COLUMN "academicCycleId";
ALTER TABLE "project_program" DROP COLUMN "academicCycleId";

DROP TABLE "academic_cycle";
DROP TYPE "AcademicTerm";

COMMIT;
