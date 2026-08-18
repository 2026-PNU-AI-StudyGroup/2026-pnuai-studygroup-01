-- 이전 백필에서 새로 삽입한 원문은 같은 CTE 스냅샷으로 다시 읽을 수 없다.
-- 이미 영속화된 모든 원문에 빠진 언어 작업만 별도 문장에서 보충한다.
INSERT INTO "translation_job" (
  "id", "sourceHash", "targetLocale", "status", "attempts",
  "availableAt", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, source."hash", locale.target, 'PENDING'::"TranslationJobStatus", 0,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "translation_source" AS source
CROSS JOIN (VALUES ('ko'::text), ('en'::text)) AS locale(target)
ON CONFLICT ("sourceHash", "targetLocale") DO NOTHING;
