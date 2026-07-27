ALTER TABLE "topic"
ADD COLUMN "managerId" TEXT;

UPDATE "topic"
SET "managerId" = "authorId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "topic_approval_request"
  WHERE "topic_approval_request"."topicId" = "topic"."id"
);

UPDATE "topic"
SET "managerId" = "topic_approval_request"."decidedById"
FROM "topic_approval_request"
WHERE "topic_approval_request"."topicId" = "topic"."id"
  AND "topic_approval_request"."status" = 'APPROVED';

ALTER TABLE "team"
DROP CONSTRAINT "team_topicId_academicCycleId_professorId_fkey";

UPDATE "team"
SET "professorId" = "topic"."managerId"
FROM "topic"
WHERE "topic"."id" = "team"."topicId"
  AND "topic"."managerId" IS NOT NULL
  AND "team"."professorId" <> "topic"."managerId";

DROP INDEX "topic_id_academicCycleId_authorId_key";

CREATE UNIQUE INDEX "topic_id_academicCycleId_managerId_key"
ON "topic"("id", "academicCycleId", "managerId");

CREATE INDEX "topic_managerId_status_idx"
ON "topic"("managerId", "status");

ALTER TABLE "topic"
ADD CONSTRAINT "topic_managerId_fkey"
FOREIGN KEY ("managerId") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team"
ADD CONSTRAINT "team_topicId_academicCycleId_professorId_fkey"
FOREIGN KEY ("topicId", "academicCycleId", "professorId")
REFERENCES "topic"("id", "academicCycleId", "managerId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "topic"
ADD CONSTRAINT "topic_published_manager_check"
CHECK ("status" = 'DRAFT' OR "managerId" IS NOT NULL);
