-- Showcase uploads were removed. Refuse to guess how any remaining files
-- should be reclassified before narrowing the enum.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "stored_file"
    WHERE "consumer"::text = 'SHOWCASE_IMAGE'
  ) THEN
    RAISE EXCEPTION
      'SHOWCASE_IMAGE stored files remain; explicit migration mapping is required';
  END IF;
END $$;

ALTER TYPE "UploadConsumer" RENAME TO "UploadConsumer_old";

CREATE TYPE "UploadConsumer" AS ENUM ('REPORT', 'ARTIFACT');

ALTER TABLE "stored_file"
  ALTER COLUMN "consumer" TYPE "UploadConsumer"
  USING ("consumer"::text::"UploadConsumer");

DROP TYPE "UploadConsumer_old";
