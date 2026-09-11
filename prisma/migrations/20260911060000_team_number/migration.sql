-- 팀 번호를 이름에서 떼어 제 칸으로 옮긴다.
--
-- 번호를 담을 칸이 없어 프로그램마다 팀 이름 앞에 적어 왔다. "1. 404Found" 도 있고
-- "A-1. Broom" 도 있다. 글자로만 세우면 A-1, A-10, A-11, A-2 처럼 열 번대가 두 번째로
-- 끼어들어 목록 차례가 어긋난다.
--
-- 앞으로 번호는 숫자로만 받는다. 그래서 칸은 정수 하나면 된다.
ALTER TABLE "project_team" ADD COLUMN "number" INTEGER;

-- 이름 앞 문자를 분과로 올린다.
--
-- CSE 캡스톤디자인 2025 의 A·B·C·D 마흔여덟 팀은 모두 미분과다. 그 문자가 어느 묶음인지
-- 알려 주는 유일한 값이라 그냥 버리면 정보가 사라진다. 분과로 올리면 목록 거르기와 표지
-- 색까지 제자리를 찾는다.
--
-- 분과를 이미 쓰는 프로그램은 건드리지 않는다. 운영자가 손으로 짜 둔 분과를 덮어쓸 수 없다.
WITH tagged AS (
  SELECT
    topic."id" AS topic_id,
    topic."programId" AS program_id,
    upper((regexp_match(team."name", '^\s*([A-Za-z]+)[\s\-_.]*\d+\s*[.\-)]'))[1]) AS letter
  FROM "project_team" AS team
  JOIN "topic" ON "topic"."id" = team."projectId"
),
eligible AS (
  SELECT DISTINCT program_id, letter
  FROM tagged
  WHERE letter IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM "program_track" AS track WHERE track."programId" = tagged.program_id
    )
),
created AS (
  INSERT INTO "program_track" ("id", "programId", "name", "position", "createdAt", "updatedAt")
  SELECT
    gen_random_uuid(),
    program_id,
    letter,
    (ROW_NUMBER() OVER (PARTITION BY program_id ORDER BY letter)) - 1,
    NOW(),
    NOW()
  FROM eligible
  RETURNING "id", "programId", "name"
)
UPDATE "topic"
SET "trackId" = created."id"
FROM tagged
JOIN created
  ON created."programId" = tagged.program_id
 AND created."name" = tagged.letter
WHERE "topic"."id" = tagged.topic_id
  AND "topic"."trackId" IS NULL;

-- 번호를 옮기고 이름에서 지운다.
--
-- 번호만 있고 이름이 없어지는 경우는 건드리지 않는다. 빈 이름으로 만들어 두면 목록에서
-- 팀을 못 알아본다. "5 Guys" 나 "B301" 처럼 번호 뒤에 구분 기호가 없는 이름은 애초에
-- 무늬가 안 맞아 걸리지 않는다.
UPDATE "project_team" AS team
SET
  "number" = ((regexp_match(team."name", '^\s*[A-Za-z]*[\s\-_.]*(\d+)\s*[.\-)]'))[1])::int,
  "name" = btrim(regexp_replace(team."name", '^\s*[A-Za-z]*[\s\-_.]*\d+\s*[.\-)]\s*', '')),
  "updatedAt" = NOW()
WHERE team."name" ~ '^\s*[A-Za-z]*[\s\-_.]*\d+\s*[.\-)]'
  AND btrim(regexp_replace(team."name", '^\s*[A-Za-z]*[\s\-_.]*\d+\s*[.\-)]\s*', '')) <> '';
