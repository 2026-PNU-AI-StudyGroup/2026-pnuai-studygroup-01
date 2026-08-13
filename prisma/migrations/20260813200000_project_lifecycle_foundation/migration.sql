-- Project is the lifecycle aggregate. Project teams only describe the assigned people.

CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'WITHDRAWN');
CREATE TYPE "ProjectTeamMembershipRole" AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE "ProjectTeamMembershipEndReason" AS ENUM ('LEFT', 'REMOVED', 'ACCOUNT_WITHDRAWN');
CREATE TYPE "AuditActorKind" AS ENUM ('USER', 'SYSTEM');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_WITHDRAWN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_TEAM_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_CANCELED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_REVIEW_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_TEAM_MEMBER_LEFT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_TEAM_MEMBER_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_TEAM_LEADERSHIP_TRANSFERRED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROJECT_TEAM_MEMBERSHIP_CORRECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PROGRAM_CLOSED';
ALTER TYPE "RecruitmentApplicationStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "TopicApplicationStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "TopicApprovalStatus" ADD VALUE IF NOT EXISTS 'WITHDRAWN';
ALTER TYPE "TopicApprovalStatus" ADD VALUE IF NOT EXISTS 'CANCELED';

ALTER TABLE "user"
  ADD COLUMN "accountStatus" "UserAccountStatus",
  ADD COLUMN "withdrawnAt" TIMESTAMP(3);
UPDATE "user"
SET "accountStatus" = CASE WHEN "isActive" THEN 'ACTIVE'::"UserAccountStatus" ELSE 'DISABLED'::"UserAccountStatus" END;
ALTER TABLE "user" ALTER COLUMN "accountStatus" SET NOT NULL;
ALTER TABLE "user" ALTER COLUMN "accountStatus" SET DEFAULT 'ACTIVE';
ALTER TABLE "user" DROP COLUMN "isActive";
ALTER TABLE "user" ADD CONSTRAINT "user_withdrawn_state_check" CHECK (
  ("accountStatus" = 'WITHDRAWN' AND "withdrawnAt" IS NOT NULL)
  OR ("accountStatus" <> 'WITHDRAWN' AND "withdrawnAt" IS NULL)
);

ALTER TABLE "audit_log"
  ADD COLUMN "actorKind" "AuditActorKind" NOT NULL DEFAULT 'USER',
  ALTER COLUMN "actorId" DROP NOT NULL;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_check" CHECK (
  ("actorKind" = 'USER' AND "actorId" IS NOT NULL)
  OR ("actorKind" = 'SYSTEM' AND "actorId" IS NULL)
);

ALTER TABLE "topic"
  ADD COLUMN "terminalAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "thumbnailPath" TEXT,
  ADD COLUMN "posterPath" TEXT;

UPDATE "topic" AS project
SET "sourceUrl" = execution_team."sourceUrl",
    "thumbnailPath" = execution_team."thumbnailPath",
    "posterPath" = execution_team."posterPath"
FROM "team" AS execution_team
WHERE execution_team."topicId" = project."id";

ALTER TABLE "team" ADD COLUMN "confirmedAt" TIMESTAMP(3);
UPDATE "team" AS execution_team
SET "confirmedAt" = COALESCE(
  (
    SELECT MIN(audit."createdAt")
    FROM "audit_log" AS audit
    WHERE audit."targetId" = execution_team."id"
      AND audit."action" = 'TEAM_CONFIRMED'
  ),
  execution_team."createdAt"
)
WHERE execution_team."status" IN ('CONFIRMED', 'CLOSED');

-- Every legacy combination has a deterministic outcome. Abort only for genuine corruption.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "team" execution_team
    LEFT JOIN "topic" project ON project."id" = execution_team."topicId"
    WHERE project."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'project lifecycle migration: orphan team detected';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM "team_member" membership
    LEFT JOIN "team" execution_team ON execution_team."id" = membership."teamId"
    LEFT JOIN "user" account ON account."id" = membership."studentId"
    WHERE execution_team."id" IS NULL OR account."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'project lifecycle migration: orphan membership detected';
  END IF;
END $$;

UPDATE "topic" AS project
SET "terminalAt" = COALESCE(
      program."closedAt",
      (
        SELECT MIN(audit."createdAt")
        FROM "audit_log" audit
        WHERE (
            audit."targetId" = project."id"
            OR audit."targetId" IN (
              SELECT execution_team."id"
              FROM "team" execution_team
              WHERE execution_team."topicId" = project."id"
            )
          )
          AND audit."action" IN ('TOPIC_CLOSED', 'TEAM_CLOSED')
      ),
      project."updatedAt"
    ),
    "cancellationReason" = CASE
      WHEN EXISTS (
        SELECT 1
        FROM "team" execution_team
        WHERE execution_team."topicId" = project."id"
          AND execution_team."status" IN ('CONFIRMED', 'CLOSED')
      ) THEN NULL
      ELSE '기존 종료 데이터에 확정된 프로젝트 팀이 없습니다.'
    END
FROM "project_program" program
WHERE program."id" = project."programId"
  AND (
    project."status" = 'CLOSED'
    OR (program."lifecycleStatus" = 'CLOSED' AND project."status" IN ('PENDING_APPROVAL', 'PUBLISHED'))
  );

CREATE TYPE "TopicStatus_new" AS ENUM ('PENDING_APPROVAL', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELED');
ALTER TABLE "topic" ADD COLUMN "status_new" "TopicStatus_new";
UPDATE "topic" SET "status_new" = (
  CASE
    WHEN "status"::text = 'PENDING_APPROVAL' AND "terminalAt" IS NOT NULL THEN 'CANCELED'
    WHEN "status"::text = 'PENDING_APPROVAL' THEN 'PENDING_APPROVAL'
    WHEN "status"::text = 'REJECTED' THEN 'REJECTED'
    WHEN "status"::text = 'PUBLISHED' AND "terminalAt" IS NULL THEN 'ACTIVE'
    WHEN "cancellationReason" IS NULL THEN 'COMPLETED'
    ELSE 'CANCELED'
  END::"TopicStatus_new"
);
ALTER TABLE "topic" ALTER COLUMN "status_new" SET NOT NULL;
DROP INDEX IF EXISTS "topic_programId_status_idx";
DROP INDEX IF EXISTS "topic_managerId_status_idx";
ALTER TABLE "topic" DROP COLUMN "status";
ALTER TABLE "topic" RENAME COLUMN "status_new" TO "status";
DROP TYPE "TopicStatus";
ALTER TYPE "TopicStatus_new" RENAME TO "TopicStatus";
CREATE INDEX "topic_programId_status_idx" ON "topic"("programId", "status");
CREATE INDEX "topic_managerId_status_idx" ON "topic"("managerId", "status");

ALTER TABLE "topic" ADD CONSTRAINT "topic_terminal_state_check" CHECK (
  ("status" IN ('COMPLETED', 'CANCELED') AND "terminalAt" IS NOT NULL)
  OR ("status" NOT IN ('COMPLETED', 'CANCELED') AND "terminalAt" IS NULL)
);
ALTER TABLE "topic" ADD CONSTRAINT "topic_cancellation_reason_check" CHECK (
  ("status" = 'CANCELED' AND length(btrim(COALESCE("cancellationReason", ''))) > 0)
  OR ("status" <> 'CANCELED' AND "cancellationReason" IS NULL)
);

-- Rename the execution-team aggregate and remove duplicated project data.
ALTER TABLE "team_member" DROP CONSTRAINT "team_member_teamId_programId_topicId_fkey";
ALTER TABLE "team_member" DROP CONSTRAINT "team_member_applicationId_studentId_topicId_fkey";
ALTER TABLE "team_member" DROP CONSTRAINT "team_member_studentId_fkey";
ALTER TABLE "team" DROP CONSTRAINT "team_topicId_programId_professorId_fkey";
DROP INDEX IF EXISTS "team_topicId_programId_professorId_key";
DROP INDEX IF EXISTS "team_id_programId_topicId_key";
DROP INDEX IF EXISTS "team_programId_status_idx";
DROP INDEX IF EXISTS "team_professorId_idx";
ALTER TABLE "team" RENAME TO "project_team";
ALTER TABLE "project_team" RENAME COLUMN "topicId" TO "projectId";
ALTER TABLE "project_team" DROP COLUMN "programId";
ALTER TABLE "project_team" DROP COLUMN "professorId";
ALTER TABLE "project_team" DROP COLUMN "sourceUrl";
ALTER TABLE "project_team" DROP COLUMN "thumbnailPath";
ALTER TABLE "project_team" DROP COLUMN "posterPath";
ALTER TABLE "project_team" DROP COLUMN "status";
ALTER TABLE "project_team" RENAME CONSTRAINT "team_pkey" TO "project_team_pkey";
ALTER INDEX "team_topicId_key" RENAME TO "project_team_projectId_key";
CREATE INDEX "project_team_confirmedAt_idx" ON "project_team"("confirmedAt");
ALTER TABLE "project_team" ADD CONSTRAINT "project_team_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename membership and preserve every accepted application as its source.
DROP INDEX IF EXISTS "team_member_teamId_studentId_key";
DROP INDEX IF EXISTS "team_member_programId_studentId_key";
DROP INDEX IF EXISTS "team_member_applicationId_studentId_topicId_key";
DROP INDEX IF EXISTS "team_member_one_leader_per_team_key";
ALTER TABLE "team_member" RENAME TO "project_team_membership";
ALTER TABLE "project_team_membership" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "project_team_membership" RENAME COLUMN "studentId" TO "userId";
ALTER TABLE "project_team_membership" RENAME COLUMN "applicationId" TO "sourceApplicationId";
ALTER TABLE "project_team_membership" DROP COLUMN "programId";
ALTER TABLE "project_team_membership" DROP COLUMN "topicId";
ALTER TABLE "project_team_membership" ADD COLUMN "endedAt" TIMESTAMP(3);
ALTER TABLE "project_team_membership" ADD COLUMN "endReason" "ProjectTeamMembershipEndReason";
ALTER TABLE "project_team_membership" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "project_team_membership" ALTER COLUMN "role" TYPE "ProjectTeamMembershipRole"
  USING "role"::text::"ProjectTeamMembershipRole";
ALTER TABLE "project_team_membership" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
ALTER TABLE "project_team_membership" ALTER COLUMN "sourceApplicationId" DROP NOT NULL;
ALTER TABLE "project_team_membership" RENAME CONSTRAINT "team_member_pkey" TO "project_team_membership_pkey";
ALTER INDEX "team_member_applicationId_key" RENAME TO "project_team_membership_sourceApplicationId_key";
DROP INDEX IF EXISTS "team_member_studentId_idx";
CREATE INDEX "project_team_membership_projectTeamId_userId_idx" ON "project_team_membership"("projectTeamId", "userId");
CREATE INDEX "project_team_membership_userId_endedAt_idx" ON "project_team_membership"("userId", "endedAt");
CREATE UNIQUE INDEX "project_team_membership_active_user_key"
  ON "project_team_membership"("projectTeamId", "userId") WHERE "endedAt" IS NULL;
CREATE UNIQUE INDEX "project_team_membership_active_leader_key"
  ON "project_team_membership"("projectTeamId") WHERE "endedAt" IS NULL AND "role" = 'LEADER';
ALTER TABLE "project_team_membership" ADD CONSTRAINT "project_team_membership_end_state_check" CHECK (
  ("endedAt" IS NULL AND "endReason" IS NULL)
  OR ("endedAt" IS NOT NULL AND "endReason" IS NOT NULL)
);
ALTER TABLE "project_team_membership" ADD CONSTRAINT "project_team_membership_projectTeamId_fkey"
  FOREIGN KEY ("projectTeamId") REFERENCES "project_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_team_membership" ADD CONSTRAINT "project_team_membership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_team_membership" ADD CONSTRAINT "project_team_membership_sourceApplicationId_fkey"
  FOREIGN KEY ("sourceApplicationId") REFERENCES "topic_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rename every project-team foreign key without losing child rows.
ALTER TABLE "announcement" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "artifact" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "discussion_post" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "progress_update" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "project_guidance_request" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "recruitment_post" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "report" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "stored_file" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "task" RENAME COLUMN "teamId" TO "projectTeamId";

ALTER INDEX "announcement_teamId_createdAt_idx" RENAME TO "announcement_projectTeamId_createdAt_idx";
ALTER INDEX "artifact_teamId_createdAt_idx" RENAME TO "artifact_projectTeamId_createdAt_idx";
ALTER INDEX "discussion_post_teamId_createdAt_idx" RENAME TO "discussion_post_projectTeamId_createdAt_idx";
ALTER INDEX "progress_update_teamId_createdAt_idx" RENAME TO "progress_update_projectTeamId_createdAt_idx";
ALTER INDEX "project_guidance_request_teamId_status_createdAt_idx" RENAME TO "project_guidance_request_projectTeamId_status_createdAt_idx";
ALTER INDEX "recruitment_post_teamId_status_idx" RENAME TO "recruitment_post_projectTeamId_status_idx";
ALTER INDEX "report_teamId_definitionId_key" RENAME TO "report_projectTeamId_definitionId_key";
ALTER INDEX "report_teamId_required_dueAt_idx" RENAME TO "report_projectTeamId_required_dueAt_idx";
ALTER INDEX "stored_file_teamId_status_idx" RENAME TO "stored_file_projectTeamId_status_idx";
ALTER INDEX "task_teamId_dueAt_idx" RENAME TO "task_projectTeamId_dueAt_idx";

ALTER TABLE "announcement" RENAME CONSTRAINT "announcement_teamId_fkey" TO "announcement_projectTeamId_fkey";
ALTER TABLE "artifact" RENAME CONSTRAINT "artifact_teamId_fkey" TO "artifact_projectTeamId_fkey";
ALTER TABLE "discussion_post" RENAME CONSTRAINT "discussion_post_teamId_fkey" TO "discussion_post_projectTeamId_fkey";
ALTER TABLE "progress_update" RENAME CONSTRAINT "progress_update_teamId_fkey" TO "progress_update_projectTeamId_fkey";
ALTER TABLE "project_guidance_request" RENAME CONSTRAINT "project_guidance_request_teamId_fkey" TO "project_guidance_request_projectTeamId_fkey";
ALTER TABLE "recruitment_post" RENAME CONSTRAINT "recruitment_post_teamId_fkey" TO "recruitment_post_projectTeamId_fkey";
ALTER TABLE "report" RENAME CONSTRAINT "report_teamId_fkey" TO "report_projectTeamId_fkey";
ALTER TABLE "stored_file" RENAME CONSTRAINT "stored_file_teamId_fkey" TO "stored_file_projectTeamId_fkey";
ALTER TABLE "task" RENAME CONSTRAINT "task_teamId_fkey" TO "task_projectTeamId_fkey";

ALTER TABLE "team_rubric_evaluation" RENAME TO "project_team_rubric_evaluation";
ALTER TABLE "project_team_rubric_evaluation" RENAME COLUMN "teamId" TO "projectTeamId";
ALTER TABLE "project_team_rubric_evaluation" RENAME CONSTRAINT "team_rubric_evaluation_pkey" TO "project_team_rubric_evaluation_pkey";
ALTER TABLE "project_team_rubric_evaluation" RENAME CONSTRAINT "team_rubric_evaluation_teamId_fkey" TO "project_team_rubric_evaluation_projectTeamId_fkey";
ALTER TABLE "project_team_rubric_evaluation" RENAME CONSTRAINT "team_rubric_evaluation_rubricId_fkey" TO "project_team_rubric_evaluation_rubricId_fkey";
ALTER INDEX "team_rubric_evaluation_teamId_idx" RENAME TO "project_team_rubric_evaluation_projectTeamId_idx";
ALTER INDEX "team_rubric_evaluation_rubricId_idx" RENAME TO "project_team_rubric_evaluation_rubricId_idx";
ALTER INDEX "team_rubric_evaluation_teamId_rubricId_key" RENAME TO "project_team_rubric_evaluation_projectTeamId_rubricId_key";

DROP TYPE "TeamMemberRole";
DROP TYPE "TeamStatus";

DROP INDEX IF EXISTS "topic_id_programId_managerId_key";
DROP INDEX IF EXISTS "topic_approval_request_topicId_key";
CREATE INDEX "topic_approval_request_topicId_status_createdAt_idx"
  ON "topic_approval_request"("topicId", "status", "createdAt");
CREATE UNIQUE INDEX "topic_approval_request_one_pending_key"
  ON "topic_approval_request"("topicId") WHERE "status" = 'PENDING';
