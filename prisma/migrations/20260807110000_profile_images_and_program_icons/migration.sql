CREATE TYPE "ProgramIcon" AS ENUM (
  'FOLDER', 'GRADUATION_CAP', 'TROPHY', 'CODE', 'FLASK', 'PALETTE',
  'ROCKET', 'BRIEFCASE', 'GLOBE', 'USERS', 'BOOK_OPEN', 'HANDSHAKE'
);

ALTER TABLE "project_program"
ADD COLUMN "icon" "ProgramIcon" NOT NULL DEFAULT 'FOLDER';

CREATE TABLE "user_profile_image" (
  "userId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_profile_image_pkey" PRIMARY KEY ("userId")
);
CREATE UNIQUE INDEX "user_profile_image_objectKey_key" ON "user_profile_image"("objectKey");
ALTER TABLE "user_profile_image"
ADD CONSTRAINT "user_profile_image_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "profile_image_upload" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "uploadObjectKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "cleanupAfter" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_image_upload_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "profile_image_upload_objectKey_key" ON "profile_image_upload"("objectKey");
CREATE UNIQUE INDEX "profile_image_upload_uploadObjectKey_key" ON "profile_image_upload"("uploadObjectKey");
CREATE INDEX "profile_image_upload_ownerId_cleanupAfter_idx" ON "profile_image_upload"("ownerId", "cleanupAfter");
CREATE INDEX "profile_image_upload_cleanupAfter_idx" ON "profile_image_upload"("cleanupAfter");
ALTER TABLE "profile_image_upload"
ADD CONSTRAINT "profile_image_upload_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
