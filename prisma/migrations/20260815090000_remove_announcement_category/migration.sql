DROP INDEX IF EXISTS "announcement_category_createdAt_idx";

ALTER TABLE "announcement" DROP COLUMN "category";

DROP TYPE "AnnouncementCategory";
