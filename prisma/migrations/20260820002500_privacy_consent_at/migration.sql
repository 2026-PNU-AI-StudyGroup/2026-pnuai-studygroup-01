-- 확인 시각이 아니라 동의 시각으로 기록한다. 이름만 바꾸고 기존 값은 그대로 둔다.
ALTER TABLE "user" RENAME COLUMN "privacyNoticeAckAt" TO "privacyConsentAt";
