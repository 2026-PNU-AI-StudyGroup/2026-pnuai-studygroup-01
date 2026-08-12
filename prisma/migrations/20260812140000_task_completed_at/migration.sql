ALTER TABLE "task"
ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "task"
SET "completedAt" = "updatedAt"
WHERE "status" = 'DONE'::"TaskStatus";

ALTER TABLE "task"
ADD CONSTRAINT "task_completed_at_matches_status"
CHECK (
  ("status" = 'DONE'::"TaskStatus" AND "completedAt" IS NOT NULL)
  OR
  ("status" <> 'DONE'::"TaskStatus" AND "completedAt" IS NULL)
);
