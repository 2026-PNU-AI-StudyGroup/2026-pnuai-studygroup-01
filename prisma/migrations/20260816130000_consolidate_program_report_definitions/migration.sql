-- 보고서 정의는 팀별 레코드가 아니라 프로그램별 설정이다.
-- 이전 데모 데이터에서 같은 프로그램의 같은 제목 정의가 팀 수만큼 생성된 경우를 하나로 통합한다.
DO $$
BEGIN
  IF EXISTS (
    WITH ranked AS (
      SELECT
        "id",
        "programId",
        FIRST_VALUE("id") OVER (
          PARTITION BY "programId", lower("title")
          ORDER BY "position", "createdAt", "id"
        ) AS canonical_id
      FROM "program_report_definition"
      WHERE "archivedAt" IS NULL
    )
    SELECT 1
    FROM "report" duplicate_report
    JOIN ranked duplicate_definition ON duplicate_definition."id" = duplicate_report."definitionId"
    JOIN "report" canonical_report
      ON canonical_report."projectTeamId" = duplicate_report."projectTeamId"
     AND canonical_report."definitionId" = duplicate_definition.canonical_id
    WHERE duplicate_definition."id" <> duplicate_definition.canonical_id
  ) THEN
    RAISE EXCEPTION '같은 팀에 중복 보고서 정의가 있어 자동 통합할 수 없습니다.';
  END IF;
END $$;

WITH ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "programId", lower("title")
      ORDER BY "position", "createdAt", "id"
    ) AS canonical_id
  FROM "program_report_definition"
  WHERE "archivedAt" IS NULL
)
UPDATE "report" AS report
SET "definitionId" = ranked.canonical_id
FROM ranked
WHERE report."definitionId" = ranked."id"
  AND ranked."id" <> ranked.canonical_id;

WITH ranked AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "programId", lower("title")
      ORDER BY "position", "createdAt", "id"
    ) AS canonical_id
  FROM "program_report_definition"
  WHERE "archivedAt" IS NULL
)
DELETE FROM "program_report_definition" AS definition
USING ranked
WHERE definition."id" = ranked."id"
  AND ranked."id" <> ranked.canonical_id;

CREATE UNIQUE INDEX "program_report_definition_programId_active_title_key"
  ON "program_report_definition" ("programId", lower("title"))
  WHERE "archivedAt" IS NULL;
