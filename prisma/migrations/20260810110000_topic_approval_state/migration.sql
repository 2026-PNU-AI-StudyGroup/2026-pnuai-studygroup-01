-- A topic is either awaiting a student-proposal review, published, rejected, or closed.
-- Stop on legacy states that cannot be classified without guessing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "topic" t
    WHERE t."status" = 'DRAFT'
      AND (
        (SELECT count(*) FROM "topic_approval_request" r WHERE r."topicId" = t."id") > 1
        OR (
          t."managerId" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "topic_approval_request" r
            WHERE r."topicId" = t."id" AND r."status" IN ('PENDING', 'REJECTED', 'APPROVED')
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'cannot classify legacy draft topics; repair their approval request and manager data first';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "topic"
    WHERE "status" IN ('PUBLISHED', 'CLOSED')
      AND ("publishedAt" IS NULL OR "managerId" IS NULL)
  ) THEN
    RAISE EXCEPTION 'published and closed topics must have publishedAt and managerId before state migration';
  END IF;
END
$$;

ALTER TABLE "topic"
  DROP CONSTRAINT "topic_publication_consistent",
  DROP CONSTRAINT "topic_published_manager_check";

CREATE TYPE "TopicStatus_new" AS ENUM ('PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'CLOSED');

ALTER TABLE "topic" ADD COLUMN "status_new" "TopicStatus_new";

UPDATE "topic" t
SET "status_new" = CASE
  WHEN t."status"::text = 'DRAFT' AND EXISTS (
    SELECT 1 FROM "topic_approval_request" r
    WHERE r."topicId" = t."id" AND r."status" = 'PENDING'
  ) THEN 'PENDING_APPROVAL'::"TopicStatus_new"
  WHEN t."status"::text = 'DRAFT' AND EXISTS (
    SELECT 1 FROM "topic_approval_request" r
    WHERE r."topicId" = t."id" AND r."status" = 'REJECTED'
  ) THEN 'REJECTED'::"TopicStatus_new"
  WHEN t."status"::text = 'DRAFT' THEN 'PUBLISHED'::"TopicStatus_new"
  ELSE t."status"::text::"TopicStatus_new"
END;

ALTER TABLE "topic" ALTER COLUMN "status_new" SET NOT NULL;
DROP INDEX "topic_programId_status_idx";
DROP INDEX "topic_managerId_status_idx";
ALTER TABLE "topic" DROP COLUMN "status";
ALTER TABLE "topic" RENAME COLUMN "status_new" TO "status";

DROP TYPE "TopicStatus";
ALTER TYPE "TopicStatus_new" RENAME TO "TopicStatus";

CREATE INDEX "topic_programId_status_idx" ON "topic"("programId", "status");
CREATE INDEX "topic_managerId_status_idx" ON "topic"("managerId", "status");

UPDATE "topic" t
SET "publishedAt" = COALESCE(
  (
    SELECT r."decidedAt"
    FROM "topic_approval_request" r
    WHERE r."topicId" = t."id" AND r."status" = 'APPROVED'
  ),
  t."createdAt"
)
WHERE "status" = 'PUBLISHED' AND "publishedAt" IS NULL;

ALTER TABLE "topic"
  ADD CONSTRAINT "topic_publication_consistent" CHECK (
    ("status" IN ('PUBLISHED', 'CLOSED') AND "publishedAt" IS NOT NULL)
    OR ("status" IN ('PENDING_APPROVAL', 'REJECTED') AND "publishedAt" IS NULL)
  ),
  ADD CONSTRAINT "topic_published_manager_check" CHECK (
    ("status" IN ('PUBLISHED', 'CLOSED') AND "managerId" IS NOT NULL)
    OR ("status" IN ('PENDING_APPROVAL', 'REJECTED') AND "managerId" IS NULL)
  );
