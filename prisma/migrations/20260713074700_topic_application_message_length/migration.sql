ALTER TABLE "topic_application"
DROP CONSTRAINT "topic_application_message_nonempty",
ADD CONSTRAINT "topic_application_message_length" CHECK (
  length(btrim("message")) BETWEEN 1 AND 2000
);
