INSERT INTO "topic_application_question" (
  "id",
  "topicId",
  "label",
  "maxLength",
  "required",
  "position"
)
SELECT
  gen_random_uuid()::text,
  "topic"."id",
  '지원 동기와 프로젝트에 기여할 수 있는 내용을 작성해 주세요.',
  2000,
  true,
  0
FROM "topic"
WHERE NOT EXISTS (
  SELECT 1
  FROM "topic_application_question"
  WHERE "topic_application_question"."topicId" = "topic"."id"
);
