CREATE FUNCTION prevent_attached_file_identity_change() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'ATTACHED' AND (
    NEW."teamId" IS DISTINCT FROM OLD."teamId"
    OR NEW."ownerId" IS DISTINCT FROM OLD."ownerId"
    OR NEW."purpose" IS DISTINCT FROM OLD."purpose"
    OR NEW."objectKey" IS DISTINCT FROM OLD."objectKey"
    OR NEW."uploadObjectKey" IS DISTINCT FROM OLD."uploadObjectKey"
    OR NEW."originalName" IS DISTINCT FROM OLD."originalName"
    OR NEW."contentType" IS DISTINCT FROM OLD."contentType"
    OR NEW."size" IS DISTINCT FROM OLD."size"
    OR NEW."sha256" IS DISTINCT FROM OLD."sha256"
  ) THEN
    RAISE EXCEPTION 'attached file identity and integrity metadata are immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stored_file_attached_immutability
BEFORE UPDATE OF "teamId", "ownerId", "purpose", "objectKey", "uploadObjectKey", "originalName", "contentType", "size", "sha256"
ON "stored_file"
FOR EACH ROW EXECUTE FUNCTION prevent_attached_file_identity_change();

CREATE FUNCTION prevent_attached_artifact_owner_change() RETURNS trigger AS $$
BEGIN
  IF OLD."fileId" IS NOT NULL
    AND NEW."registeredById" IS DISTINCT FROM OLD."registeredById"
  THEN
    RAISE EXCEPTION 'attached artifact registrant is immutable'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artifact_attached_owner_immutability
BEFORE UPDATE OF "registeredById" ON "artifact"
FOR EACH ROW EXECUTE FUNCTION prevent_attached_artifact_owner_change();
