-- A student team is only the source for a proposal. Pending proposals now own
-- their own project-team snapshot, so legacy requests cannot be kept safely.
DELETE FROM "project_team"
WHERE "projectId" IN (
  SELECT "id" FROM "topic" WHERE "status" = 'PENDING_APPROVAL'
);

DELETE FROM "topic"
WHERE "status" = 'PENDING_APPROVAL';

DROP INDEX IF EXISTS "topic_approval_request_studentTeamId_idx";
ALTER TABLE "topic_approval_request"
  DROP CONSTRAINT IF EXISTS "topic_approval_request_studentTeamId_fkey",
  DROP COLUMN IF EXISTS "studentTeamId",
  DROP COLUMN IF EXISTS "studentTeamVersion";
