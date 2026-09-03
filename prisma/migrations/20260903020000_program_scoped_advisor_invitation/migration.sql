-- 자문위원 초대를 프로그램 단위로 바꾼다.
--
-- 이전 초대 링크에는 프로그램 개념이 없어 어느 프로그램에 부른 위원인지 알 수 없다.
-- 남겨 두면 프로그램 소속 없는 위원이 되어 아무 화면에도 닿지 못하므로, 기존 링크는
-- 전부 회수하고 운영자가 프로그램 관리 화면에서 다시 초대한다.

-- CreateTable
CREATE TABLE "program_advisor_invitation" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "program_advisor_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_advisor_invitation_userId_revokedAt_idx" ON "program_advisor_invitation"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "program_advisor_invitation_programId_userId_key" ON "program_advisor_invitation"("programId", "userId");

-- AddForeignKey
ALTER TABLE "program_advisor_invitation" ADD CONSTRAINT "program_advisor_invitation_programId_fkey" FOREIGN KEY ("programId") REFERENCES "project_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_advisor_invitation" ADD CONSTRAINT "program_advisor_invitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_advisor_invitation" ADD CONSTRAINT "program_advisor_invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 기존 링크 회수: 소속 프로그램을 알 수 없는 링크는 살릴 방법이 없다.
-- 세션까지 지워야 이미 들어와 있던 위원도 함께 나간다.
DELETE FROM "session" WHERE "userId" IN (SELECT "id" FROM "user" WHERE "role" = 'ADVISOR');
DELETE FROM "advisor_access_token";

-- DropForeignKey
ALTER TABLE "advisor_access_token" DROP CONSTRAINT "advisor_access_token_userId_fkey";

-- DropIndex
DROP INDEX "advisor_access_token_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "advisor_access_token" DROP COLUMN "userId",
ADD COLUMN     "invitationId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "advisor_access_token_invitationId_createdAt_idx" ON "advisor_access_token"("invitationId", "createdAt");

-- AddForeignKey
ALTER TABLE "advisor_access_token" ADD CONSTRAINT "advisor_access_token_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "program_advisor_invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
