CREATE TYPE "ProjectAssistantInvitationStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELED'
);

ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_ASSISTANT_INVITED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_ASSISTANT_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_ASSISTANT_REMOVED';

CREATE TABLE "project_assistant" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "grantedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_assistant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_assistant_invitation" (
  "id" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "inviteeId" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "status" "ProjectAssistantInvitationStatus" NOT NULL DEFAULT 'PENDING',
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_assistant_invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_assistant_topicId_userId_key"
  ON "project_assistant"("topicId", "userId");
CREATE INDEX "project_assistant_userId_createdAt_idx"
  ON "project_assistant"("userId", "createdAt");
CREATE INDEX "project_assistant_invitation_topicId_status_createdAt_idx"
  ON "project_assistant_invitation"("topicId", "status", "createdAt");
CREATE INDEX "project_assistant_invitation_inviteeId_status_createdAt_idx"
  ON "project_assistant_invitation"("inviteeId", "status", "createdAt");

ALTER TABLE "project_assistant"
  ADD CONSTRAINT "project_assistant_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_assistant"
  ADD CONSTRAINT "project_assistant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_assistant"
  ADD CONSTRAINT "project_assistant_grantedById_fkey"
  FOREIGN KEY ("grantedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_assistant_invitation"
  ADD CONSTRAINT "project_assistant_invitation_topicId_fkey"
  FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_assistant_invitation"
  ADD CONSTRAINT "project_assistant_invitation_inviteeId_fkey"
  FOREIGN KEY ("inviteeId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_assistant_invitation"
  ADD CONSTRAINT "project_assistant_invitation_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
