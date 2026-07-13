ALTER TABLE "topic_application"
ADD CONSTRAINT "topic_application_decision_consistent" CHECK (
  ("status" = 'PENDING' AND "decidedAt" IS NULL)
  OR ("status" IN ('ACCEPTED', 'REJECTED') AND "decidedAt" IS NOT NULL)
),
ADD CONSTRAINT "topic_application_message_nonempty" CHECK (
  length(btrim("message")) > 0
);
