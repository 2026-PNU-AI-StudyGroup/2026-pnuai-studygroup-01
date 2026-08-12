-- CreateEnum
CREATE TYPE "AnnouncementVisibility" AS ENUM ('AUTHENTICATED', 'TARGET_MEMBERS');

-- AlterTable
ALTER TABLE "announcement"
ADD COLUMN "visibility" "AnnouncementVisibility" NOT NULL DEFAULT 'AUTHENTICATED';

-- Existing team notices keep their member-only semantics. Existing global and
-- program notices intentionally remain AUTHENTICATED.
UPDATE "announcement"
SET "visibility" = 'TARGET_MEMBERS'
WHERE "teamId" IS NOT NULL;
