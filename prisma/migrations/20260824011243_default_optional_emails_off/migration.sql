-- AlterTable
ALTER TABLE "email_preference" ALTER COLUMN "programActivityEnabled" SET DEFAULT false,
ALTER COLUMN "deadlineEnabled" SET DEFAULT false;

-- 이미 저장된 행도 함께 끈다. 대부분은 사용자가 고른 값이 아니라 폼의 기본값이 그대로
-- 저장된 것이다. 받고 싶은 사람이 마이페이지에서 다시 켜는 방식으로 통일한다.
UPDATE "email_preference"
SET "programActivityEnabled" = false,
    "deadlineEnabled" = false;
