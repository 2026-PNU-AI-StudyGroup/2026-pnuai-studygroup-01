-- CreateEnum
CREATE TYPE "ProjectTeamInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- CreateTable
CREATE TABLE "project_team_invitation" (
    "id" TEXT NOT NULL,
    "projectTeamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviteeId" TEXT,
    "invitedById" TEXT NOT NULL,
    "status" "ProjectTeamInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_team_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_team_invitation_email_status_createdAt_idx" ON "project_team_invitation"("email", "status", "createdAt");

-- CreateIndex
CREATE INDEX "project_team_invitation_inviteeId_status_idx" ON "project_team_invitation"("inviteeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_team_invitation_projectTeamId_email_key" ON "project_team_invitation"("projectTeamId", "email");

-- AddForeignKey
ALTER TABLE "project_team_invitation" ADD CONSTRAINT "project_team_invitation_projectTeamId_fkey" FOREIGN KEY ("projectTeamId") REFERENCES "project_team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_invitation" ADD CONSTRAINT "project_team_invitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_team_invitation" ADD CONSTRAINT "project_team_invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
