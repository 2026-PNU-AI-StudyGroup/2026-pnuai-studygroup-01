CREATE TYPE "UploadConsumer" AS ENUM ('REPORT', 'ARTIFACT', 'SHOWCASE_IMAGE');

ALTER TABLE "stored_file"
  ADD COLUMN "consumer" "UploadConsumer";

UPDATE "stored_file"
SET "consumer" = CASE
  WHEN "purpose" = 'REPORT' THEN 'REPORT'::"UploadConsumer"
  ELSE 'ARTIFACT'::"UploadConsumer"
END;

ALTER TABLE "stored_file"
  ALTER COLUMN "consumer" SET NOT NULL;

CREATE OR REPLACE FUNCTION attach_report_file() RETURNS trigger AS $$
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
  IF TG_OP = 'UPDATE' AND NEW."fileId" = OLD."fileId" AND NEW."teamId" = OLD."teamId" THEN
    RETURN NEW;
  END IF;

  UPDATE "stored_file"
  SET "status" = 'ATTACHED'
  WHERE "id" = NEW."fileId"
    AND "teamId" = NEW."teamId"
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
