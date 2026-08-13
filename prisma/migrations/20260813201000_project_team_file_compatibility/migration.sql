-- ProjectTeam lifecycle migration renamed every execution-team foreign key.
-- Recreate PL/pgSQL bodies because PostgreSQL does not rewrite field names
-- embedded in function source when a column is renamed.

CREATE OR REPLACE FUNCTION attach_report_file() RETURNS trigger AS $$
DECLARE
  report_project_team_id TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'report versions are immutable' USING ERRCODE = '23514';
  END IF;

  SELECT "projectTeamId" INTO report_project_team_id
  FROM "report" WHERE "id" = NEW."reportId";

  UPDATE "stored_file"
  SET "status" = 'ATTACHED'
  WHERE "id" = NEW."fileId"
    AND "projectTeamId" = report_project_team_id
    AND "ownerId" = NEW."submitterId"
    AND "purpose" = 'REPORT'
    AND "consumer" = 'REPORT'
    AND "status" = 'READY';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'report file must be owned by submitter, READY, REPORT consumer, and belong to the report team'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION attach_artifact_file() RETURNS trigger AS $$
BEGIN
  IF NEW."fileId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
    AND NEW."fileId" = OLD."fileId"
    AND NEW."projectTeamId" = OLD."projectTeamId"
  THEN
    RETURN NEW;
  END IF;

  UPDATE "stored_file"
  SET "status" = 'ATTACHED'
  WHERE "id" = NEW."fileId"
    AND "projectTeamId" = NEW."projectTeamId"
    AND "ownerId" = NEW."registeredById"
    AND "purpose" = 'ARTIFACT'
    AND "consumer" = 'ARTIFACT'
    AND "status" = 'READY';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'artifact file must be owned by registrant, READY, ARTIFACT consumer, and belong to the artifact team'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION attach_announcement_file() RETURNS trigger AS $$
DECLARE
  attached_file_size INTEGER;
  attachment_count INTEGER;
  attachment_size BIGINT;
BEGIN
  PERFORM 1
  FROM "announcement"
  WHERE "id" = NEW."announcementId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'announcement attachment requires an existing announcement'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*), COALESCE(sum("stored_file"."size"), 0)
  INTO attachment_count, attachment_size
  FROM "announcement_attachment"
  JOIN "stored_file" ON "stored_file"."id" = "announcement_attachment"."fileId"
  WHERE "announcement_attachment"."announcementId" = NEW."announcementId";

  IF attachment_count >= 5 THEN
    RAISE EXCEPTION 'announcement cannot have more than 5 attachments'
      USING ERRCODE = '23514';
  END IF;

  UPDATE "stored_file"
  SET "status" = 'ATTACHED'
  WHERE "id" = NEW."fileId"
    AND "projectTeamId" IS NULL
    AND "ownerId" = NEW."uploadedById"
    AND "purpose" = 'ANNOUNCEMENT'
    AND "consumer" = 'ANNOUNCEMENT'
    AND "status" = 'READY'
  RETURNING "size" INTO attached_file_size;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'announcement file must be owned by uploader, READY, and use ANNOUNCEMENT purpose'
      USING ERRCODE = '23514';
  END IF;

  IF attachment_size + attached_file_size > 524288000 THEN
    RAISE EXCEPTION 'announcement attachments cannot exceed 500 MiB'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_attached_file_identity_change() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'ATTACHED' AND (
    NEW."status" IS DISTINCT FROM OLD."status"
    OR NEW."projectTeamId" IS DISTINCT FROM OLD."projectTeamId"
    OR NEW."ownerId" IS DISTINCT FROM OLD."ownerId"
    OR NEW."purpose" IS DISTINCT FROM OLD."purpose"
    OR NEW."objectKey" IS DISTINCT FROM OLD."objectKey"
    OR NEW."uploadObjectKey" IS DISTINCT FROM OLD."uploadObjectKey"
    OR NEW."originalName" IS DISTINCT FROM OLD."originalName"
    OR NEW."contentType" IS DISTINCT FROM OLD."contentType"
    OR NEW."size" IS DISTINCT FROM OLD."size"
    OR NEW."sha256" IS DISTINCT FROM OLD."sha256"
  ) THEN
    RAISE EXCEPTION 'attached file status, identity, and integrity metadata are immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
