UPDATE "stored_file"
SET "uploadObjectKey" = 'staging/legacy/' || "id"
WHERE "uploadObjectKey" NOT LIKE 'staging/%';

ALTER TABLE "stored_file"
ADD CONSTRAINT "stored_file_staging_key" CHECK (
  "uploadObjectKey" LIKE 'staging/%'
),
ADD CONSTRAINT "stored_file_cleanup_after_expiry" CHECK (
  "cleanupAfter" >= "expiresAt" + INTERVAL '1 day'
);
