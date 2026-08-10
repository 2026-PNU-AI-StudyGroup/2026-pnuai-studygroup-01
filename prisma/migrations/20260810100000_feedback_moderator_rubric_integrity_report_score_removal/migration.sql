-- Feedback responses and status history must identify the authenticated moderator.
ALTER TABLE "feedback_post"
  ADD COLUMN "resolvedById" TEXT;

ALTER TABLE "feedback_status_change"
  ADD COLUMN "changedById" TEXT;

ALTER TABLE "feedback_comment"
  RENAME COLUMN "developerName" TO "authorName";

ALTER TABLE "feedback_comment"
  ADD COLUMN "authorId" TEXT;

ALTER TABLE "feedback_post"
  ADD CONSTRAINT "feedback_post_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback_status_change"
  ADD CONSTRAINT "feedback_status_change_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback_comment"
  ADD CONSTRAINT "feedback_comment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rubric criteria become immutable once they have been used for an official score.
ALTER TABLE "report_rubric_score"
  DROP CONSTRAINT "report_rubric_score_criterionId_fkey";

ALTER TABLE "report_rubric_score"
  ADD CONSTRAINT "report_rubric_score_criterionId_fkey"
  FOREIGN KEY ("criterionId") REFERENCES "rubric_criterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The rubric total is the sole official score. Legacy scalar scores are intentionally discarded.
ALTER TABLE "report"
  DROP CONSTRAINT "report_scoredById_fkey";

ALTER TABLE "report"
  DROP COLUMN "score",
  DROP COLUMN "scoreComment",
  DROP COLUMN "scoredById",
  DROP COLUMN "scoredAt";
