ALTER TABLE "topic"
ADD CONSTRAINT "topic_capacity_positive" CHECK ("capacity" > 0),
ADD CONSTRAINT "topic_recruitment_period_valid" CHECK ("recruitmentStartsAt" < "recruitmentEndsAt"),
ADD CONSTRAINT "topic_execution_period_valid" CHECK ("executionStartsAt" < "executionEndsAt"),
ADD CONSTRAINT "topic_submission_period_valid" CHECK ("submissionStartsAt" < "submissionEndsAt");
