CREATE TYPE "FeedbackPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

ALTER TABLE "feedback_post"
ADD COLUMN "priority" "FeedbackPriority" NOT NULL DEFAULT 'NORMAL';

DROP INDEX "feedback_post_status_createdAt_idx";

CREATE INDEX "feedback_post_status_priority_createdAt_idx"
ON "feedback_post"("status", "priority", "createdAt");
