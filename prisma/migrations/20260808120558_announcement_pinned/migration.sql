-- AlterTable
ALTER TABLE "announcement" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "announcement_pinned_createdAt_idx" ON "announcement"("pinned", "createdAt");
