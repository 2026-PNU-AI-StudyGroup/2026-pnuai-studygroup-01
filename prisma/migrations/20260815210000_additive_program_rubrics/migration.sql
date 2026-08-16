-- Common rubrics are assigned to every active program team. Division rubrics are
-- additive, not replacements for the common set.
--
-- Older CUSTOM divisions contain transactional copies of common rubrics. Fold
-- only exact copies back into their original common rubric, preserving both
-- internal and advisor score history by remapping the matching criteria first.
CREATE TEMP TABLE "additive_rubric_clone_map" ON COMMIT DROP AS
SELECT
  scoped."id" AS "scopedRubricId",
  common."id" AS "commonRubricId"
FROM "rubric_definition" AS scoped
JOIN "program_track" AS division ON division."id" = scoped."divisionId"
JOIN "rubric_definition" AS common
  ON common."programId" = scoped."programId"
 AND common."divisionId" IS NULL
 AND common."archivedAt" IS NULL
 AND common."legacy" = false
 AND common."title" = scoped."title"
 AND common."gradingDueAt" = scoped."gradingDueAt"
 AND common."position" = scoped."position"
 AND common."audience" = scoped."audience"
WHERE division."rubricMode" = 'CUSTOM'
  AND scoped."archivedAt" IS NULL
  AND scoped."legacy" = false
  AND COALESCE((
    SELECT jsonb_agg(jsonb_build_array(c."position", c."label", c."maxPoints") ORDER BY c."position")
    FROM "rubric_criterion" AS c
    WHERE c."rubricId" = scoped."id"
  ), '[]'::jsonb) = COALESCE((
    SELECT jsonb_agg(jsonb_build_array(c."position", c."label", c."maxPoints") ORDER BY c."position")
    FROM "rubric_criterion" AS c
    WHERE c."rubricId" = common."id"
  ), '[]'::jsonb);

-- The old replacement invariant guarantees no common evaluation for a CUSTOM
-- division. Stop instead of silently merging if a hand-modified database
-- violates that invariant and could lose a score.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "project_team_rubric_evaluation" AS scoped
    JOIN "additive_rubric_clone_map" AS map ON map."scopedRubricId" = scoped."rubricId"
    JOIN "project_team_rubric_evaluation" AS common
      ON common."projectTeamId" = scoped."projectTeamId"
     AND common."rubricId" = map."commonRubricId"
  ) THEN
    RAISE EXCEPTION 'additive rubric migration stopped: common and copied rubric evaluations coexist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "advisor_evaluation" AS scoped
    JOIN "additive_rubric_clone_map" AS map ON map."scopedRubricId" = scoped."rubricId"
    JOIN "advisor_evaluation" AS common
      ON common."projectTeamId" = scoped."projectTeamId"
     AND common."advisorId" = scoped."advisorId"
     AND common."rubricId" = map."commonRubricId"
  ) THEN
    RAISE EXCEPTION 'additive rubric migration stopped: common and copied advisor evaluations coexist';
  END IF;
END $$;

UPDATE "rubric_score" AS score
SET "criterionId" = common_criterion."id"
FROM "project_team_rubric_evaluation" AS evaluation
JOIN "additive_rubric_clone_map" AS map ON map."scopedRubricId" = evaluation."rubricId"
JOIN "rubric_criterion" AS scoped_criterion
  ON scoped_criterion."rubricId" = map."scopedRubricId"
JOIN "rubric_criterion" AS common_criterion
  ON common_criterion."rubricId" = map."commonRubricId"
 AND common_criterion."position" = scoped_criterion."position"
 AND common_criterion."label" = scoped_criterion."label"
 AND common_criterion."maxPoints" = scoped_criterion."maxPoints"
WHERE score."evaluationId" = evaluation."id"
  AND scoped_criterion."id" = score."criterionId";

UPDATE "advisor_score" AS score
SET "criterionId" = common_criterion."id"
FROM "advisor_evaluation" AS evaluation
JOIN "additive_rubric_clone_map" AS map ON map."scopedRubricId" = evaluation."rubricId"
JOIN "rubric_criterion" AS scoped_criterion
  ON scoped_criterion."rubricId" = map."scopedRubricId"
JOIN "rubric_criterion" AS common_criterion
  ON common_criterion."rubricId" = map."commonRubricId"
 AND common_criterion."position" = scoped_criterion."position"
 AND common_criterion."label" = scoped_criterion."label"
 AND common_criterion."maxPoints" = scoped_criterion."maxPoints"
WHERE score."evaluationId" = evaluation."id"
  AND scoped_criterion."id" = score."criterionId";

UPDATE "project_team_rubric_evaluation" AS evaluation
SET "rubricId" = map."commonRubricId"
FROM "additive_rubric_clone_map" AS map
WHERE evaluation."rubricId" = map."scopedRubricId";

UPDATE "advisor_evaluation" AS evaluation
SET "rubricId" = map."commonRubricId"
FROM "additive_rubric_clone_map" AS map
WHERE evaluation."rubricId" = map."scopedRubricId";

DELETE FROM "rubric_definition" AS rubric
USING "additive_rubric_clone_map" AS map
WHERE rubric."id" = map."scopedRubricId";

-- Fill gaps created under the replacement model. Scoped rubrics already remain
-- assigned only to their own division; common rubrics are now added to all
-- active teams, including teams that belong to a division.
INSERT INTO "project_team_rubric_evaluation" ("id", "projectTeamId", "rubricId", "createdAt")
SELECT gen_random_uuid()::text, team."id", rubric."id", CURRENT_TIMESTAMP
FROM "project_team" AS team
JOIN "topic" AS topic ON topic."id" = team."projectId"
JOIN "rubric_definition" AS rubric
  ON rubric."programId" = topic."programId"
 AND rubric."divisionId" IS NULL
 AND rubric."archivedAt" IS NULL
 AND rubric."legacy" = false
LEFT JOIN "project_team_rubric_evaluation" AS assigned
  ON assigned."projectTeamId" = team."id"
 AND assigned."rubricId" = rubric."id"
WHERE topic."status" = 'ACTIVE'
  AND assigned."id" IS NULL;

ALTER TABLE "program_track" DROP COLUMN "rubricMode";
DROP TYPE "ProgramDivisionRubricMode";
