CREATE TYPE "TeamMemberRole" AS ENUM ('LEADER', 'MEMBER');

ALTER TABLE "team_member"
ADD COLUMN "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER';

-- 기존 실행 팀은 요청에 따라 가장 먼저 합류한 학생 한 명을 팀장으로 이관한다.
WITH ranked_members AS (
  SELECT
    member."id",
    ROW_NUMBER() OVER (
      PARTITION BY member."teamId"
      ORDER BY
        member."joinedAt" ASC,
        member."id" ASC
    ) AS position
  FROM "team_member" AS member
)
UPDATE "team_member" AS member
SET "role" = 'LEADER'
FROM ranked_members
WHERE ranked_members."id" = member."id"
  AND ranked_members.position = 1;

CREATE UNIQUE INDEX "team_member_one_leader_per_team_key"
ON "team_member"("teamId")
WHERE "role" = 'LEADER';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "team_member"
    GROUP BY "teamId"
    HAVING COUNT(*) FILTER (WHERE "role" = 'LEADER') <> 1
  ) THEN
    RAISE EXCEPTION '각 실행 팀에는 정확히 한 명의 팀장이 있어야 합니다.';
  END IF;
END $$;
