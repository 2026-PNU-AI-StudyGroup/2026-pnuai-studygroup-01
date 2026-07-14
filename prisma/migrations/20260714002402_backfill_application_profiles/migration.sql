UPDATE "topic_application"
SET "skills" = ARRAY['기존 지원서 미입력']::TEXT[]
WHERE cardinality("skills") = 0;

UPDATE "topic_application"
SET "desiredRole" = '기존 지원서 미입력'
WHERE btrim("desiredRole") = '';

UPDATE "topic_application"
SET "availability" = '기존 지원서 미입력'
WHERE btrim("availability") = '';

ALTER TABLE "topic_application"
  ALTER COLUMN "skills" SET DEFAULT ARRAY['기존 지원서 미입력']::TEXT[],
  ALTER COLUMN "desiredRole" SET DEFAULT '기존 지원서 미입력',
  ALTER COLUMN "availability" SET DEFAULT '기존 지원서 미입력';
