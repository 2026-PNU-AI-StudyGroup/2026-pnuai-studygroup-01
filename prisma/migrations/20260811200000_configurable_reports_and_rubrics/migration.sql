-- Administrator-defined reports and independent team rubric evaluations.
CREATE TYPE "ProgramDivisionRubricMode" AS ENUM ('INHERIT_COMMON', 'CUSTOM');
CREATE TYPE "RubricAudience" AS ENUM ('STAFF_ONLY', 'TEAM_MEMBERS');

ALTER TYPE "AuditAction" ADD VALUE 'PROGRAM_REPORT_DEFINITION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROGRAM_REPORT_DEFINITION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROGRAM_REPORT_DEFINITION_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'PROGRAM_RUBRIC_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROGRAM_RUBRIC_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROGRAM_RUBRIC_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'PROGRAM_DIVISION_RUBRIC_MODE_CHANGED';

ALTER TABLE "program_track"
  ADD COLUMN "rubricMode" "ProgramDivisionRubricMode" NOT NULL DEFAULT 'INHERIT_COMMON';

CREATE TABLE "program_report_definition" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "program_report_definition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "program_report_definition_id_programId_key"
  ON "program_report_definition"("id", "programId");
CREATE INDEX "program_report_definition_programId_archivedAt_position_idx"
  ON "program_report_definition"("programId", "archivedAt", "position");
ALTER TABLE "program_report_definition"
  ADD CONSTRAINT "program_report_definition_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "project_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A fixed report type cannot be converted to one program deadline when teams diverge.
DO $$
DECLARE conflicts jsonb;
BEGIN
  SELECT jsonb_agg(row_to_json(conflict)) INTO conflicts
  FROM (
    SELECT t."programId", r."type"::text AS "reportType",
           jsonb_agg(jsonb_build_object('teamId', t."id", 'dueAt', r."dueAt") ORDER BY t."id") AS assignments
    FROM "report" r
    JOIN "team" t ON t."id" = r."teamId"
    GROUP BY t."programId", r."type"
    HAVING COUNT(DISTINCT r."dueAt") > 1
  ) conflict;
  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'configurable report migration stopped: divergent deadlines=%', conflicts;
  END IF;
END $$;

CREATE TEMP TABLE "configurable_deliverable_migration_baseline" AS
SELECT
  (SELECT count(*) FROM "report_version")::bigint AS "versionCount",
  (SELECT count(*) FROM "approval_decision")::bigint AS "decisionCount",
  (SELECT count(*) FROM "report_feedback")::bigint AS "feedbackCount",
  (SELECT count(*) FROM "report_rubric_score")::bigint AS "scoreCount",
  (SELECT COALESCE(sum("points"), 0) FROM "report_rubric_score")::bigint AS "scoreSum",
  (SELECT count(*) FROM "report_rubric_release")::bigint AS "releaseCount";

INSERT INTO "program_report_definition" (
  "id", "programId", "title", "dueAt", "position", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  t."programId",
  CASE r."type"::text
    WHEN 'START' THEN '착수 보고서'
    WHEN 'MIDTERM' THEN '중간 보고서'
    ELSE '결과 보고서'
  END,
  MIN(r."dueAt"),
  CASE r."type"::text WHEN 'START' THEN 0 WHEN 'MIDTERM' THEN 1 ELSE 2 END,
  MIN(r."createdAt"),
  CURRENT_TIMESTAMP
FROM "report" r
JOIN "team" t ON t."id" = r."teamId"
GROUP BY t."programId", r."type";

ALTER TABLE "report"
  ADD COLUMN "definitionId" TEXT,
  ADD COLUMN "titleSnapshot" TEXT,
  ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;

UPDATE "report" r
SET
  "definitionId" = d."id",
  "titleSnapshot" = d."title"
FROM "team" t, "program_report_definition" d
WHERE t."id" = r."teamId"
  AND d."programId" = t."programId"
  AND d."position" = CASE r."type"::text WHEN 'START' THEN 0 WHEN 'MIDTERM' THEN 1 ELSE 2 END;

-- Existing non-closed teams receive every active program definition.
INSERT INTO "report" (
  "id", "teamId", "type", "definitionId", "titleSnapshot", "dueAt", "required", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  t."id",
  CASE d."position" WHEN 0 THEN 'START' WHEN 1 THEN 'MIDTERM' ELSE 'FINAL' END::"ReportType",
  d."id",
  d."title",
  d."dueAt",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "team" t
JOIN "program_report_definition" d ON d."programId" = t."programId" AND d."archivedAt" IS NULL
LEFT JOIN "report" r ON r."teamId" = t."id" AND r."definitionId" = d."id"
WHERE t."status" <> 'CLOSED' AND r."id" IS NULL;

ALTER TABLE "report" ALTER COLUMN "definitionId" SET NOT NULL;
ALTER TABLE "report" ALTER COLUMN "titleSnapshot" SET NOT NULL;
DROP INDEX "report_teamId_type_key";
DROP INDEX "report_teamId_dueAt_idx";
ALTER TABLE "report" DROP COLUMN "type";
DROP TYPE "ReportType";
CREATE UNIQUE INDEX "report_teamId_definitionId_key" ON "report"("teamId", "definitionId");
CREATE INDEX "report_teamId_required_dueAt_idx" ON "report"("teamId", "required", "dueAt");
CREATE INDEX "report_definitionId_idx" ON "report"("definitionId");
ALTER TABLE "report"
  ADD CONSTRAINT "report_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "program_report_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "rubric_definition" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "divisionId" TEXT,
  "title" TEXT NOT NULL,
  "gradingDueAt" TIMESTAMP(3) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "audience" "RubricAudience" NOT NULL DEFAULT 'STAFF_ONLY',
  "archivedAt" TIMESTAMP(3),
  "legacy" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rubric_definition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rubric_definition_id_programId_key" ON "rubric_definition"("id", "programId");
CREATE INDEX "rubric_definition_programId_divisionId_archivedAt_position_idx"
  ON "rubric_definition"("programId", "divisionId", "archivedAt", "position");
ALTER TABLE "rubric_definition"
  ADD CONSTRAINT "rubric_definition_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "project_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rubric_definition"
  ADD CONSTRAINT "rubric_definition_divisionId_programId_fkey"
  FOREIGN KEY ("divisionId", "programId") REFERENCES "program_track"("id", "programId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "team_rubric_evaluation" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "rubricId" TEXT NOT NULL,
  "legacyMemberVisible" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_rubric_evaluation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_rubric_evaluation_teamId_rubricId_key"
  ON "team_rubric_evaluation"("teamId", "rubricId");
CREATE INDEX "team_rubric_evaluation_teamId_idx" ON "team_rubric_evaluation"("teamId");
CREATE INDEX "team_rubric_evaluation_rubricId_idx" ON "team_rubric_evaluation"("rubricId");
ALTER TABLE "team_rubric_evaluation"
  ADD CONSTRAINT "team_rubric_evaluation_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_rubric_evaluation"
  ADD CONSTRAINT "team_rubric_evaluation_rubricId_fkey"
  FOREIGN KEY ("rubricId") REFERENCES "rubric_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "rubric_score" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "criterionId" TEXT NOT NULL,
  "points" INTEGER NOT NULL,
  "scoredByName" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rubric_score_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rubric_score_evaluationId_criterionId_key"
  ON "rubric_score"("evaluationId", "criterionId");
CREATE INDEX "rubric_score_evaluationId_idx" ON "rubric_score"("evaluationId");

ALTER TABLE "rubric_criterion" ADD COLUMN "rubricId" TEXT;

-- Preserve the old program rubric as a new active common rubric.
INSERT INTO "rubric_definition" (
  "id", "programId", "title", "gradingDueAt", "position", "audience", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  c."programId",
  '공식 평가',
  p."endsAt",
  0,
  'STAFF_ONLY'::"RubricAudience",
  MIN(c."createdAt"),
  CURRENT_TIMESTAMP
FROM "rubric_criterion" c
JOIN "project_program" p ON p."id" = c."programId"
GROUP BY c."programId", p."endsAt";

UPDATE "rubric_criterion" c
SET "rubricId" = d."id"
FROM "rubric_definition" d
WHERE d."programId" = c."programId" AND d."legacy" = false AND d."divisionId" IS NULL;

-- Existing active teams receive the new common rubric.
INSERT INTO "team_rubric_evaluation" ("id", "teamId", "rubricId", "createdAt")
SELECT gen_random_uuid()::text, t."id", d."id", CURRENT_TIMESTAMP
FROM "team" t
JOIN "topic" tp ON tp."id" = t."topicId"
JOIN "rubric_definition" d ON d."programId" = t."programId" AND d."divisionId" IS NULL AND d."legacy" = false
LEFT JOIN "program_track" div ON div."id" = tp."trackId"
WHERE t."status" <> 'CLOSED'
  AND COALESCE(div."rubricMode", 'INHERIT_COMMON'::"ProgramDivisionRubricMode") = 'INHERIT_COMMON';

-- Convert old report-bound scores to read-only legacy team evaluations.
CREATE TEMP TABLE "legacy_rubric_map" (
  "programId" TEXT NOT NULL,
  "reportPosition" INTEGER NOT NULL,
  "rubricId" TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO "legacy_rubric_map" ("programId", "reportPosition", "rubricId")
SELECT legacy."programId", legacy."reportPosition", gen_random_uuid()::text
FROM (
  SELECT t."programId", d."position" AS "reportPosition"
  FROM "report_rubric_score" s
  JOIN "report" r ON r."id" = s."reportId"
  JOIN "team" t ON t."id" = r."teamId"
  JOIN "program_report_definition" d ON d."id" = r."definitionId"
  UNION
  SELECT t."programId", d."position" AS "reportPosition"
  FROM "report_rubric_release" rel
  JOIN "report" r ON r."id" = rel."reportId"
  JOIN "team" t ON t."id" = r."teamId"
  JOIN "program_report_definition" d ON d."id" = r."definitionId"
) legacy;

INSERT INTO "rubric_definition" (
  "id", "programId", "title", "gradingDueAt", "position", "audience", "archivedAt", "legacy", "createdAt", "updatedAt"
)
SELECT
  m."rubricId",
  m."programId",
  CASE m."reportPosition" WHEN 0 THEN '기존 착수 보고서 평가' WHEN 1 THEN '기존 중간 보고서 평가' ELSE '기존 결과 보고서 평가' END,
  p."endsAt",
  m."reportPosition",
  'STAFF_ONLY'::"RubricAudience",
  CURRENT_TIMESTAMP,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "legacy_rubric_map" m
JOIN "project_program" p ON p."id" = m."programId";

CREATE TEMP TABLE "legacy_criterion_map" (
  "oldCriterionId" TEXT NOT NULL,
  "rubricId" TEXT NOT NULL,
  "newCriterionId" TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO "legacy_criterion_map" ("oldCriterionId", "rubricId", "newCriterionId")
SELECT c."id", m."rubricId", gen_random_uuid()::text
FROM "rubric_criterion" c
JOIN "legacy_rubric_map" m ON m."programId" = c."programId";

INSERT INTO "rubric_criterion" ("id", "programId", "rubricId", "label", "maxPoints", "position", "createdAt")
SELECT map."newCriterionId", c."programId", map."rubricId", c."label", c."maxPoints", c."position", c."createdAt"
FROM "legacy_criterion_map" map
JOIN "rubric_criterion" c ON c."id" = map."oldCriterionId";

CREATE TEMP TABLE "legacy_evaluation_map" (
  "reportId" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "rubricId" TEXT NOT NULL
) ON COMMIT DROP;

INSERT INTO "legacy_evaluation_map" ("reportId", "evaluationId", "rubricId")
SELECT DISTINCT r."id", gen_random_uuid()::text, m."rubricId"
FROM "report" r
JOIN "team" t ON t."id" = r."teamId"
JOIN "program_report_definition" d ON d."id" = r."definitionId"
JOIN "legacy_rubric_map" m ON m."programId" = t."programId" AND m."reportPosition" = d."position"
WHERE EXISTS (SELECT 1 FROM "report_rubric_score" s WHERE s."reportId" = r."id")
   OR EXISTS (SELECT 1 FROM "report_rubric_release" rel WHERE rel."reportId" = r."id");

INSERT INTO "team_rubric_evaluation" (
  "id", "teamId", "rubricId", "legacyMemberVisible", "createdAt"
)
SELECT
  em."evaluationId",
  r."teamId",
  em."rubricId",
  EXISTS (SELECT 1 FROM "report_rubric_release" rel WHERE rel."reportId" = r."id"),
  r."createdAt"
FROM "legacy_evaluation_map" em
JOIN "report" r ON r."id" = em."reportId";

INSERT INTO "rubric_score" (
  "id", "evaluationId", "criterionId", "points", "scoredByName", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  em."evaluationId",
  cm."newCriterionId",
  s."points",
  s."scoredByName",
  s."updatedAt"
FROM "report_rubric_score" s
JOIN "legacy_evaluation_map" em ON em."reportId" = s."reportId"
JOIN "legacy_criterion_map" cm ON cm."oldCriterionId" = s."criterionId" AND cm."rubricId" = em."rubricId";

DO $$
BEGIN
  IF (SELECT count(*) FROM "rubric_score") <> (SELECT "scoreCount" FROM "configurable_deliverable_migration_baseline") THEN
    RAISE EXCEPTION 'configurable rubric migration stopped: score count mismatch';
  END IF;
  IF (SELECT COALESCE(sum("points"), 0) FROM "rubric_score") <> (SELECT "scoreSum" FROM "configurable_deliverable_migration_baseline") THEN
    RAISE EXCEPTION 'configurable rubric migration stopped: score sum mismatch';
  END IF;
  IF (SELECT count(*) FROM "team_rubric_evaluation" WHERE "legacyMemberVisible" = true)
      <> (SELECT "releaseCount" FROM "configurable_deliverable_migration_baseline") THEN
    RAISE EXCEPTION 'configurable rubric migration stopped: release count mismatch';
  END IF;
  IF (SELECT count(*) FROM "report_version") <> (SELECT "versionCount" FROM "configurable_deliverable_migration_baseline") OR
     (SELECT count(*) FROM "approval_decision") <> (SELECT "decisionCount" FROM "configurable_deliverable_migration_baseline") OR
     (SELECT count(*) FROM "report_feedback") <> (SELECT "feedbackCount" FROM "configurable_deliverable_migration_baseline") THEN
    RAISE EXCEPTION 'configurable report migration stopped: report history count mismatch';
  END IF;
END $$;

DROP TABLE "report_rubric_release";
DROP TABLE "report_rubric_score";
ALTER TABLE "rubric_criterion" DROP CONSTRAINT "rubric_criterion_programId_fkey";
DROP INDEX "rubric_criterion_programId_position_idx";
ALTER TABLE "rubric_criterion" DROP COLUMN "programId";
ALTER TABLE "rubric_criterion" ALTER COLUMN "rubricId" SET NOT NULL;
CREATE INDEX "rubric_criterion_rubricId_position_idx" ON "rubric_criterion"("rubricId", "position");
ALTER TABLE "rubric_criterion"
  ADD CONSTRAINT "rubric_criterion_rubricId_fkey"
  FOREIGN KEY ("rubricId") REFERENCES "rubric_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rubric_score"
  ADD CONSTRAINT "rubric_score_evaluationId_fkey"
  FOREIGN KEY ("evaluationId") REFERENCES "team_rubric_evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rubric_score"
  ADD CONSTRAINT "rubric_score_criterionId_fkey"
  FOREIGN KEY ("criterionId") REFERENCES "rubric_criterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
