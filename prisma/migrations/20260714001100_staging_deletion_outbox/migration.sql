CREATE OR REPLACE FUNCTION queue_stored_file_deletion() RETURNS trigger AS $$
BEGIN
  INSERT INTO "object_deletion_job" (
    "id", "objectKey", "createdAt", "nextAttemptAt"
  )
  VALUES (
    OLD."id", OLD."objectKey", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  ON CONFLICT ("objectKey") DO UPDATE
  SET "nextAttemptAt" = LEAST(
    "object_deletion_job"."nextAttemptAt",
    EXCLUDED."nextAttemptAt"
  );

  INSERT INTO "object_deletion_job" (
    "id", "objectKey", "createdAt", "nextAttemptAt"
  )
  VALUES (
    OLD."id" || ':upload', OLD."uploadObjectKey", CURRENT_TIMESTAMP,
    OLD."cleanupAfter"
  )
  ON CONFLICT ("objectKey") DO UPDATE
  SET "nextAttemptAt" = GREATEST(
    "object_deletion_job"."nextAttemptAt",
    EXCLUDED."nextAttemptAt"
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
