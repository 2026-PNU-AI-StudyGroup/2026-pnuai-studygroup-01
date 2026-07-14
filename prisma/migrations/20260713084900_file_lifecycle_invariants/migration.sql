ALTER TABLE "stored_file"
ADD CONSTRAINT "stored_file_status_ready_at_consistent" CHECK (
  ("status" = 'PENDING' AND "readyAt" IS NULL)
  OR ("status" IN ('READY', 'ATTACHED') AND "readyAt" IS NOT NULL)
);

CREATE FUNCTION queue_stored_file_deletion() RETURNS trigger AS $$
BEGIN
  INSERT INTO "object_deletion_job" ("id", "objectKey", "createdAt")
  VALUES (OLD."id", OLD."objectKey", CURRENT_TIMESTAMP)
  ON CONFLICT ("objectKey") DO NOTHING;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stored_file_deletion_outbox
AFTER DELETE ON "stored_file"
FOR EACH ROW EXECUTE FUNCTION queue_stored_file_deletion();

CREATE FUNCTION attach_report_file() RETURNS trigger AS $$
DECLARE
  report_team_id TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'report versions are immutable' USING ERRCODE = '23514';
  END IF;

  SELECT "teamId" INTO report_team_id
  FROM "report" WHERE "id" = NEW."reportId";

  UPDATE "stored_file"
  SET "status" = 'ATTACHED'
  WHERE "id" = NEW."fileId"
    AND "teamId" = report_team_id
    AND "purpose" = 'REPORT'
    AND "status" = 'READY';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'report file must be READY, REPORT purpose, and belong to the report team'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_version_file_attachment
BEFORE INSERT OR UPDATE ON "report_version"
FOR EACH ROW EXECUTE FUNCTION attach_report_file();

CREATE FUNCTION attach_artifact_file() RETURNS trigger AS $$
BEGIN
  IF NEW."fileId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."fileId" = OLD."fileId" AND NEW."teamId" = OLD."teamId" THEN
    RETURN NEW;
  END IF;

  UPDATE "stored_file"
  SET "status" = 'ATTACHED'
  WHERE "id" = NEW."fileId"
    AND "teamId" = NEW."teamId"
    AND "purpose" = 'ARTIFACT'
    AND "status" = 'READY';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'artifact file must be READY, ARTIFACT purpose, and belong to the artifact team'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artifact_file_attachment
BEFORE INSERT OR UPDATE OF "fileId", "teamId" ON "artifact"
FOR EACH ROW EXECUTE FUNCTION attach_artifact_file();
