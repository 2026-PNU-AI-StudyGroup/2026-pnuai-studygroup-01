-- AlterTable
ALTER TABLE "announcement" ADD COLUMN     "popup" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "announcement_popup_createdAt_idx" ON "announcement"("popup", "createdAt");
