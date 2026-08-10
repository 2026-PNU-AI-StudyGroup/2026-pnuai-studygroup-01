ALTER TABLE "student_team"
  ADD COLUMN "compositionVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "topic_approval_request"
  ADD COLUMN "studentTeamVersion" INTEGER;

UPDATE "topic_approval_request" AS request
SET "studentTeamVersion" = team."compositionVersion"
FROM "student_team" AS team
WHERE request."studentTeamId" = team."id";
