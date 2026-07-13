ALTER TABLE "team_member" ADD COLUMN "topicId" TEXT;

UPDATE "team_member" AS "member"
SET "topicId" = "application"."topicId"
FROM "topic_application" AS "application"
WHERE "member"."applicationId" = "application"."id";

ALTER TABLE "team_member" ALTER COLUMN "topicId" SET NOT NULL;

ALTER TABLE "team_member"
DROP CONSTRAINT "team_member_teamId_fkey",
DROP CONSTRAINT "team_member_academicCycleId_fkey",
DROP CONSTRAINT "team_member_applicationId_fkey",
DROP COLUMN "role";

DROP TYPE "TeamMemberRole";

CREATE UNIQUE INDEX "team_id_academicCycleId_topicId_key"
ON "team"("id", "academicCycleId", "topicId");

CREATE UNIQUE INDEX "topic_application_id_studentId_topicId_key"
ON "topic_application"("id", "studentId", "topicId");

CREATE UNIQUE INDEX "team_member_applicationId_studentId_topicId_key"
ON "team_member"("applicationId", "studentId", "topicId");

ALTER TABLE "team_member"
ADD CONSTRAINT "team_member_teamId_academicCycleId_topicId_fkey"
FOREIGN KEY ("teamId", "academicCycleId", "topicId")
REFERENCES "team"("id", "academicCycleId", "topicId")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "team_member_applicationId_studentId_topicId_fkey"
FOREIGN KEY ("applicationId", "studentId", "topicId")
REFERENCES "topic_application"("id", "studentId", "topicId")
ON DELETE RESTRICT ON UPDATE CASCADE;
