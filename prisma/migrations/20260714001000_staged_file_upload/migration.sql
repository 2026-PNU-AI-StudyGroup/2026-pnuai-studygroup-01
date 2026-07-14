ALTER TABLE "stored_file"
ADD COLUMN "uploadObjectKey" TEXT,
ADD COLUMN "cleanupAfter" TIMESTAMP(3);

UPDATE "stored_file"
SET "uploadObjectKey" = "objectKey",
    "cleanupAfter" = "expiresAt" + INTERVAL '1 day';

ALTER TABLE "stored_file"
ALTER COLUMN "uploadObjectKey" SET NOT NULL,
ALTER COLUMN "cleanupAfter" SET NOT NULL;

CREATE UNIQUE INDEX "stored_file_uploadObjectKey_key"
ON "stored_file"("uploadObjectKey");

DROP INDEX "stored_file_status_expiresAt_idx";
CREATE INDEX "stored_file_status_cleanupAfter_idx"
ON "stored_file"("status", "cleanupAfter");
