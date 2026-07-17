ALTER TABLE "topic_application_answer"
DROP CONSTRAINT "topic_application_answer_questionId_fkey",
ADD CONSTRAINT "topic_application_answer_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "topic_application_question"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_application_draft_answer"
DROP CONSTRAINT "team_application_draft_answer_questionId_fkey",
ADD CONSTRAINT "team_application_draft_answer_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "topic_application_question"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
