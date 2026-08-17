-- 개인정보 처리방침 고지 확인 시각. 최초 로그인 시 1회 기록한다.
ALTER TABLE "user" ADD COLUMN "privacyNoticeAckAt" TIMESTAMP(3);
