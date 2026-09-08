-- 초대가 하나도 남지 않은 자문위원 계정을 비활성으로 내린다.
--
-- 초대를 거둘 때 링크와 세션은 끊었지만 계정 상태는 그대로 두었다. 그래서 사용자 관리
-- 목록에는 해지된 위원이 "아직 접속할 수 있는 사람" 으로 남아 있었다. 실제로는 링크가
-- 전부 회수됐고 자문위원은 구글 로그인을 쓸 수 없어 들어올 길이 없다.
--
-- 살아 있는 초대가 하나라도 있으면 건드리지 않는다. 두 프로그램에 불려 있다가 한쪽만
-- 거둔 위원은 계속 심사해야 한다. 탈퇴 계정도 건드리지 않는다 -- 탈퇴는 비활성화보다
-- 무거운 상태라 되돌려선 안 된다.
UPDATE "user" AS u
SET "accountStatus" = 'DISABLED',
    "updatedAt" = NOW()
WHERE u."role" = 'ADVISOR'
  AND u."accountStatus" = 'ACTIVE'
  AND NOT EXISTS (
    SELECT 1
    FROM "program_advisor_invitation" AS i
    WHERE i."userId" = u."id"
      AND i."revokedAt" IS NULL
  );

-- 위에서 내린 계정의 남은 세션을 정리한다. 계정 검사만으로도 접근은 막히지만, 초대를
-- 거둘 때 세션을 지우기 시작한 것은 프로그램 스코프 초대를 도입한 뒤부터다. 그 전에
-- 해지된 위원에게는 세션 행이 남아 있을 수 있다.
DELETE FROM "session"
WHERE "userId" IN (
  SELECT u."id"
  FROM "user" AS u
  WHERE u."role" = 'ADVISOR'
    AND u."accountStatus" = 'DISABLED'
);
