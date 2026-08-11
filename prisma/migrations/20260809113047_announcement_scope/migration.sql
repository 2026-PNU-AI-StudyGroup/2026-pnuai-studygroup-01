-- AlterTable
ALTER TABLE "announcement" ADD COLUMN     "programId" TEXT,
ADD COLUMN     "teamId" TEXT;

-- CreateIndex
CREATE INDEX "announcement_teamId_createdAt_idx" ON "announcement"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "announcement_programId_createdAt_idx" ON "announcement"("programId", "createdAt");

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_programId_fkey" FOREIGN KEY ("programId") REFERENCES "project_program"("id") ON DELETE SET NULL ON UPDATE CASCADE;
