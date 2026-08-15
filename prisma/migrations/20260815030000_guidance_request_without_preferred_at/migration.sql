ALTER TABLE "project_guidance_request"
  DROP CONSTRAINT "project_guidance_request_kind_fields_check";

-- 학생 요청 단계에서는 회의 희망 시각을 받지 않는다. 기존 회의 요청의 값은
-- 이력으로 보존하되 새 요청은 애플리케이션 경계에서 NULL만 저장한다.
ALTER TABLE "project_guidance_request"
  ADD CONSTRAINT "project_guidance_request_kind_fields_check" CHECK (
    "kind" = 'MEETING'
    OR ("kind" = 'REVIEW' AND "preferredAt" IS NULL)
  );
