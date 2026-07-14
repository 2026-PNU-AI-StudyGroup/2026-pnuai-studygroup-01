CREATE OR REPLACE FUNCTION queue_stored_file_deletion() RETURNS trigger AS $$
BEGIN
  INSERT INTO "object_deletion_job" (
    "id", "objectKey", "createdAt", "nextAttemptAt"
  )
  VALUES (
    OLD."id", OLD."objectKey", CURRENT_TIMESTAMP,
    GREATEST(CURRENT_TIMESTAMP, OLD."expiresAt")
  )
  ON CONFLICT ("objectKey") DO UPDATE
  SET "nextAttemptAt" = GREATEST(
    "object_deletion_job"."nextAttemptAt",
    EXCLUDED."nextAttemptAt"
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
