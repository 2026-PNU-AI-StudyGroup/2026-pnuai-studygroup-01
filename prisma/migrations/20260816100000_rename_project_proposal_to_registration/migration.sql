-- Notification and outbox content is persisted at creation time. Rewrite only
-- system-generated TOPIC_APPROVAL copy so prior notifications use the current
-- project-registration terminology without touching user-entered project titles.
UPDATE "notification"
SET
  "title" = CASE "title"
    WHEN '프로젝트 제안 승인 요청이 도착했습니다' THEN '프로젝트 등록 승인 요청이 도착했습니다'
    WHEN '프로젝트 제안 승인 요청이 접수되었습니다' THEN '프로젝트 등록 승인 요청이 접수되었습니다'
    WHEN '프로젝트 제안이 승인되었습니다' THEN '프로젝트 등록이 승인되었습니다'
    WHEN '프로젝트 제안이 반려되었습니다' THEN '프로젝트 등록이 반려되었습니다'
    WHEN '프로젝트 제안이 취소되었습니다' THEN '프로젝트 등록이 취소되었습니다'
    ELSE "title"
  END,
  "body" = CASE
    WHEN "body" ~ ' 프로젝트 제안을 검토해 주세요\.$' THEN regexp_replace("body", ' 프로젝트 제안을 검토해 주세요\.$', ' 프로젝트 등록을 검토해 주세요.')
    WHEN "body" ~ ' 프로젝트 제안이 접수되었습니다\. 검토 결과는 PMS에서 안내합니다\.$' THEN regexp_replace("body", ' 프로젝트 제안이 접수되었습니다\. 검토 결과는 PMS에서 안내합니다\.$', ' 프로젝트 등록이 접수되었습니다. 검토 결과는 PMS에서 안내합니다.')
    WHEN "body" ~ ' 제안이 승인되어 공개되었습니다\.$' THEN regexp_replace("body", ' 제안이 승인되어 공개되었습니다\.$', ' 등록이 승인되어 공개되었습니다.')
    WHEN "body" ~ ' 제안이 반려되었습니다\. 검토 의견을 확인해 주세요\.$' THEN regexp_replace("body", ' 제안이 반려되었습니다\. 검토 의견을 확인해 주세요\.$', ' 등록이 반려되었습니다. 검토 의견을 확인해 주세요.')
    WHEN "body" ~ ' 제안이 프로그램 종료로 취소되었습니다\.$' THEN regexp_replace("body", ' 제안이 프로그램 종료로 취소되었습니다\.$', ' 등록이 프로그램 종료로 취소되었습니다.')
    ELSE "body"
  END
WHERE "type" = 'TOPIC_APPROVAL'
  AND (
    "title" IN (
      '프로젝트 제안 승인 요청이 도착했습니다',
      '프로젝트 제안 승인 요청이 접수되었습니다',
      '프로젝트 제안이 승인되었습니다',
      '프로젝트 제안이 반려되었습니다',
      '프로젝트 제안이 취소되었습니다'
    )
    OR "body" ~ ' 프로젝트 제안을 검토해 주세요\.$'
    OR "body" ~ ' 프로젝트 제안이 접수되었습니다\. 검토 결과는 PMS에서 안내합니다\.$'
    OR "body" ~ ' 제안이 승인되어 공개되었습니다\.$'
    OR "body" ~ ' 제안이 반려되었습니다\. 검토 의견을 확인해 주세요\.$'
    OR "body" ~ ' 제안이 프로그램 종료로 취소되었습니다\.$'
  );

-- Never rewrite already sent email, which is delivery history. PENDING and
-- RETRY_WAIT rows can still reach recipients with stale persisted copy.
UPDATE "email_delivery"
SET
  "title" = CASE "title"
    WHEN '프로젝트 제안 승인 요청이 도착했습니다' THEN '프로젝트 등록 승인 요청이 도착했습니다'
    WHEN '프로젝트 제안 승인 요청이 접수되었습니다' THEN '프로젝트 등록 승인 요청이 접수되었습니다'
    WHEN '프로젝트 제안이 승인되었습니다' THEN '프로젝트 등록이 승인되었습니다'
    WHEN '프로젝트 제안이 반려되었습니다' THEN '프로젝트 등록이 반려되었습니다'
    WHEN '프로젝트 제안이 취소되었습니다' THEN '프로젝트 등록이 취소되었습니다'
    ELSE "title"
  END,
  "body" = CASE
    WHEN "body" ~ ' 프로젝트 제안을 검토해 주세요\.$' THEN regexp_replace("body", ' 프로젝트 제안을 검토해 주세요\.$', ' 프로젝트 등록을 검토해 주세요.')
    WHEN "body" ~ ' 프로젝트 제안이 접수되었습니다\. 검토 결과는 PMS에서 안내합니다\.$' THEN regexp_replace("body", ' 프로젝트 제안이 접수되었습니다\. 검토 결과는 PMS에서 안내합니다\.$', ' 프로젝트 등록이 접수되었습니다. 검토 결과는 PMS에서 안내합니다.')
    WHEN "body" ~ ' 제안이 승인되어 공개되었습니다\.$' THEN regexp_replace("body", ' 제안이 승인되어 공개되었습니다\.$', ' 등록이 승인되어 공개되었습니다.')
    WHEN "body" ~ ' 제안이 반려되었습니다\. 검토 의견을 확인해 주세요\.$' THEN regexp_replace("body", ' 제안이 반려되었습니다\. 검토 의견을 확인해 주세요\.$', ' 등록이 반려되었습니다. 검토 의견을 확인해 주세요.')
    WHEN "body" ~ ' 제안이 프로그램 종료로 취소되었습니다\.$' THEN regexp_replace("body", ' 제안이 프로그램 종료로 취소되었습니다\.$', ' 등록이 프로그램 종료로 취소되었습니다.')
    ELSE "body"
  END,
  "titleEn" = CASE "titleEn"
    WHEN 'Project proposal approval requested' THEN 'Project registration approval requested'
    WHEN 'Project proposal approval request received' THEN 'Project registration approval request received'
    WHEN 'Project proposal approved' THEN 'Project registration approved'
    WHEN 'Project proposal rejected' THEN 'Project registration rejected'
    WHEN 'Project proposal canceled' THEN 'Project registration canceled'
    ELSE "titleEn"
  END,
  "bodyEn" = CASE
    WHEN "bodyEn" ~ '^Review the proposal for .* in PMS\.$' THEN regexp_replace("bodyEn", '^Review the proposal for (.*) in PMS\.$', 'Review the registration for \1 in PMS.')
    WHEN "bodyEn" ~ '^Your proposal for .* was received\. PMS will provide the review result\.$' THEN regexp_replace("bodyEn", '^Your proposal for (.*) was received\. PMS will provide the review result\.$', 'Your registration for \1 was received. PMS will provide the review result.')
    WHEN "bodyEn" ~ '^The proposal for .* was approved and is now visible\.$' THEN regexp_replace("bodyEn", '^The proposal for (.*) was approved and is now visible\.$', 'The registration for \1 was approved and is now visible.')
    WHEN "bodyEn" ~ '^The proposal for .* was rejected\. Review the feedback in PMS\.$' THEN regexp_replace("bodyEn", '^The proposal for (.*) was rejected\. Review the feedback in PMS\.$', 'The registration for \1 was rejected. Review the feedback in PMS.')
    WHEN "bodyEn" ~ '^The proposal for .* was canceled because the program has ended\.$' THEN regexp_replace("bodyEn", '^The proposal for (.*) was canceled because the program has ended\.$', 'The registration for \1 was canceled because the program has ended.')
    ELSE "bodyEn"
  END
WHERE "kind" = 'TOPIC_APPROVAL'
  AND "status" IN ('PENDING', 'RETRY_WAIT')
  AND (
    "title" IN (
      '프로젝트 제안 승인 요청이 도착했습니다',
      '프로젝트 제안 승인 요청이 접수되었습니다',
      '프로젝트 제안이 승인되었습니다',
      '프로젝트 제안이 반려되었습니다',
      '프로젝트 제안이 취소되었습니다'
    )
    OR "body" ~ ' 프로젝트 제안을 검토해 주세요\.$'
    OR "body" ~ ' 프로젝트 제안이 접수되었습니다\. 검토 결과는 PMS에서 안내합니다\.$'
    OR "body" ~ ' 제안이 승인되어 공개되었습니다\.$'
    OR "body" ~ ' 제안이 반려되었습니다\. 검토 의견을 확인해 주세요\.$'
    OR "body" ~ ' 제안이 프로그램 종료로 취소되었습니다\.$'
    OR "titleEn" IN (
      'Project proposal approval requested',
      'Project proposal approval request received',
      'Project proposal approved',
      'Project proposal rejected',
      'Project proposal canceled'
    )
    OR "bodyEn" ~ '^Review the proposal for .* in PMS\.$'
    OR "bodyEn" ~ '^Your proposal for .* was received\. PMS will provide the review result\.$'
    OR "bodyEn" ~ '^The proposal for .* was approved and is now visible\.$'
    OR "bodyEn" ~ '^The proposal for .* was rejected\. Review the feedback in PMS\.$'
    OR "bodyEn" ~ '^The proposal for .* was canceled because the program has ended\.$'
  );
