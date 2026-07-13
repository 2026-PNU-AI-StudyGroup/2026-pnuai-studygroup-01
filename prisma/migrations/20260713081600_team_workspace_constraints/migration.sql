ALTER TABLE "milestone"
ADD CONSTRAINT "milestone_title_length" CHECK (
  length(btrim("title")) BETWEEN 1 AND 200
);

ALTER TABLE "progress_update"
ADD CONSTRAINT "progress_update_content_length" CHECK (
  length(btrim("content")) BETWEEN 1 AND 5000
),
ADD CONSTRAINT "progress_update_risk_length" CHECK (
  length("risk") <= 2000
),
ADD CONSTRAINT "progress_update_next_action_length" CHECK (
  length("nextAction") <= 2000
);
