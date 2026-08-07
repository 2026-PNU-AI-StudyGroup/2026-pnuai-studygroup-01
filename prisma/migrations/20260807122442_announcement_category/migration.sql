-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('GENERAL', 'HACKATHON', 'GRADUATION_PROJECT');

-- AlterTable
ALTER TABLE "announcement" ADD COLUMN     "category" "AnnouncementCategory" NOT NULL DEFAULT 'GENERAL';

-- CreateIndex
CREATE INDEX "announcement_category_createdAt_idx" ON "announcement"("category", "createdAt");
