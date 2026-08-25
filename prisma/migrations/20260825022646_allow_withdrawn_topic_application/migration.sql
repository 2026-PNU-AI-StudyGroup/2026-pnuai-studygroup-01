-- 철회(WITHDRAWN)가 어느 쪽 조건에도 들어가지 않아 제약이 통째로 막고 있었다.
-- 계정 탈퇴로 대기 중 지원을 물리는 경로가 그래서 항상 실패했다.
-- 철회도 결정이 난 상태다. 결정 시각을 남기는 쪽에 함께 둔다.
ALTER TABLE "topic_application"
DROP CONSTRAINT "topic_application_decision_consistent";

ALTER TABLE "topic_application"
ADD CONSTRAINT "topic_application_decision_consistent" CHECK (
  ("status" = 'PENDING' AND "decidedAt" IS NULL)
  OR ("status" IN ('ACCEPTED', 'REJECTED', 'WITHDRAWN') AND "decidedAt" IS NOT NULL)
);
