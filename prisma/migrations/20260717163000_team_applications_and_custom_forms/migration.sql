CREATE TYPE "TopicApplicationMode" AS ENUM ('TEAM_ONLY', 'INDIVIDUAL_ONLY', 'INDIVIDUAL_OR_TEAM');
CREATE TYPE "TopicApplicationKind" AS ENUM ('INDIVIDUAL', 'TEAM');
CREATE TYPE "TopicApplicationParticipantRole" AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE "TeamApplicationInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

ALTER TABLE "topic"
ADD COLUMN "applicationMode" "TopicApplicationMode" NOT NULL DEFAULT 'INDIVIDUAL_ONLY';

CREATE TABLE "topic_application_question" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "maxLength" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL,
  CONSTRAINT "topic_application_question_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "topic_application_group" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "leaderId" TEXT NOT NULL,
  "kind" "TopicApplicationKind" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "topic_application_group_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "topic_application"
ADD COLUMN "groupId" TEXT,
ADD COLUMN "participantRole" "TopicApplicationParticipantRole" NOT NULL DEFAULT 'LEADER';

CREATE TABLE "topic_application_answer" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "topic_application_answer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_application_draft" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "leaderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "team_application_draft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_application_draft_answer" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  CONSTRAINT "team_application_draft_answer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_application_invitation" (
  "id" TEXT NOT NULL,
  "draftId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "inviteeId" TEXT,
  "status" "TeamApplicationInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_application_invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "topic_application_question_topicId_position_key" ON "topic_application_question"("topicId", "position");
CREATE INDEX "topic_application_question_topicId_idx" ON "topic_application_question"("topicId");
CREATE INDEX "topic_application_group_topicId_createdAt_idx" ON "topic_application_group"("topicId", "createdAt");
CREATE INDEX "topic_application_group_leaderId_createdAt_idx" ON "topic_application_group"("leaderId", "createdAt");
CREATE INDEX "topic_application_groupId_participantRole_idx" ON "topic_application"("groupId", "participantRole");
CREATE UNIQUE INDEX "topic_application_answer_groupId_questionId_key" ON "topic_application_answer"("groupId", "questionId");
CREATE INDEX "topic_application_answer_questionId_idx" ON "topic_application_answer"("questionId");
CREATE UNIQUE INDEX "team_application_draft_topicId_leaderId_key" ON "team_application_draft"("topicId", "leaderId");
CREATE INDEX "team_application_draft_leaderId_createdAt_idx" ON "team_application_draft"("leaderId", "createdAt");
CREATE UNIQUE INDEX "team_application_draft_answer_draftId_questionId_key" ON "team_application_draft_answer"("draftId", "questionId");
CREATE INDEX "team_application_draft_answer_questionId_idx" ON "team_application_draft_answer"("questionId");
CREATE UNIQUE INDEX "team_application_invitation_draftId_email_key" ON "team_application_invitation"("draftId", "email");
CREATE INDEX "team_application_invitation_email_status_createdAt_idx" ON "team_application_invitation"("email", "status", "createdAt");
CREATE INDEX "team_application_invitation_inviteeId_status_idx" ON "team_application_invitation"("inviteeId", "status");

ALTER TABLE "topic_application_question" ADD CONSTRAINT "topic_application_question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_application_group" ADD CONSTRAINT "topic_application_group_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_application_group" ADD CONSTRAINT "topic_application_group_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "topic_application" ADD CONSTRAINT "topic_application_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "topic_application_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_application_answer" ADD CONSTRAINT "topic_application_answer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "topic_application_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "topic_application_answer" ADD CONSTRAINT "topic_application_answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "topic_application_question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "team_application_draft" ADD CONSTRAINT "team_application_draft_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_application_draft" ADD CONSTRAINT "team_application_draft_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_application_draft_answer" ADD CONSTRAINT "team_application_draft_answer_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "team_application_draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_application_draft_answer" ADD CONSTRAINT "team_application_draft_answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "topic_application_question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "team_application_invitation" ADD CONSTRAINT "team_application_invitation_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "team_application_draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_application_invitation" ADD CONSTRAINT "team_application_invitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
