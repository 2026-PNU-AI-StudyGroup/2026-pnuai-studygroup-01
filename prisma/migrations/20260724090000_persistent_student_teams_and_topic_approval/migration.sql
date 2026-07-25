CREATE TYPE "StudentTeamMemberRole" AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE "StudentTeamInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');
CREATE TYPE "TopicApprovalRoute" AS ENUM ('PROFESSOR', 'ADMIN');
CREATE TYPE "TopicApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "student_team" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "leaderId" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_team_member" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "role" "StudentTeamMemberRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_team_member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_team_invitation" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "inviteeId" TEXT,
  "invitedById" TEXT NOT NULL,
  "status" "StudentTeamInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_team_invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "topic_approval_request" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "route" "TopicApprovalRoute" NOT NULL,
  "requestedProfessorId" TEXT,
  "status" "TopicApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "reviewComment" TEXT NOT NULL DEFAULT '',
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "topic_approval_request_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "topic_approval_route_target_check" CHECK (
    ("route" = 'PROFESSOR' AND "requestedProfessorId" IS NOT NULL)
    OR ("route" = 'ADMIN' AND "requestedProfessorId" IS NULL)
  )
);

CREATE TABLE "student_team_recruitment_post" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "roleNeeded" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "status" "RecruitmentPostStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_team_recruitment_post_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "student_team_recruitment_application" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "desiredRole" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "status" "RecruitmentApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_team_recruitment_application_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "topic_application_group" ADD COLUMN "studentTeamId" TEXT;

CREATE UNIQUE INDEX "student_team_member_teamId_studentId_key" ON "student_team_member"("teamId", "studentId");
CREATE INDEX "student_team_member_studentId_joinedAt_idx" ON "student_team_member"("studentId", "joinedAt");
CREATE INDEX "student_team_leaderId_deletedAt_idx" ON "student_team"("leaderId", "deletedAt");
CREATE INDEX "student_team_deletedAt_updatedAt_idx" ON "student_team"("deletedAt", "updatedAt");
CREATE UNIQUE INDEX "student_team_invitation_teamId_email_key" ON "student_team_invitation"("teamId", "email");
CREATE INDEX "student_team_invitation_email_status_createdAt_idx" ON "student_team_invitation"("email", "status", "createdAt");
CREATE INDEX "student_team_invitation_inviteeId_status_idx" ON "student_team_invitation"("inviteeId", "status");
CREATE UNIQUE INDEX "topic_approval_request_topicId_key" ON "topic_approval_request"("topicId");
CREATE INDEX "topic_approval_request_status_route_createdAt_idx" ON "topic_approval_request"("status", "route", "createdAt");
CREATE INDEX "topic_approval_request_requestedProfessorId_status_idx" ON "topic_approval_request"("requestedProfessorId", "status");
CREATE INDEX "topic_approval_request_requesterId_createdAt_idx" ON "topic_approval_request"("requesterId", "createdAt");
CREATE INDEX "topic_application_group_studentTeamId_createdAt_idx" ON "topic_application_group"("studentTeamId", "createdAt");
CREATE INDEX "student_team_recruitment_post_status_createdAt_idx" ON "student_team_recruitment_post"("status", "createdAt");
CREATE INDEX "student_team_recruitment_post_teamId_status_idx" ON "student_team_recruitment_post"("teamId", "status");
CREATE UNIQUE INDEX "student_team_recruitment_application_postId_studentId_key" ON "student_team_recruitment_application"("postId", "studentId");
CREATE INDEX "student_team_recruitment_application_studentId_status_idx" ON "student_team_recruitment_application"("studentId", "status");

ALTER TABLE "student_team" ADD CONSTRAINT "student_team_leaderId_fkey"
  FOREIGN KEY ("leaderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_team_member" ADD CONSTRAINT "student_team_member_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "student_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_team_member" ADD CONSTRAINT "student_team_member_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_team_invitation" ADD CONSTRAINT "student_team_invitation_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "student_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_team_invitation" ADD CONSTRAINT "student_team_invitation_inviteeId_fkey"
  FOREIGN KEY ("inviteeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_team_invitation" ADD CONSTRAINT "student_team_invitation_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "topic_application_group" ADD CONSTRAINT "topic_application_group_studentTeamId_fkey"
  FOREIGN KEY ("studentTeamId") REFERENCES "student_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_team_recruitment_post" ADD CONSTRAINT "student_team_recruitment_post_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "student_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_team_recruitment_post" ADD CONSTRAINT "student_team_recruitment_post_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_team_recruitment_application" ADD CONSTRAINT "student_team_recruitment_application_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "student_team_recruitment_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_team_recruitment_application" ADD CONSTRAINT "student_team_recruitment_application_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "topic_approval_request" ADD CONSTRAINT "topic_approval_request_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_approval_request" ADD CONSTRAINT "topic_approval_request_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "topic_approval_request" ADD CONSTRAINT "topic_approval_request_requestedProfessorId_fkey"
  FOREIGN KEY ("requestedProfessorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "topic_approval_request" ADD CONSTRAINT "topic_approval_request_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
