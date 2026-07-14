CREATE FUNCTION delete_detached_report_file() RETURNS trigger AS $$
BEGIN
  DELETE FROM "stored_file" WHERE "id" = OLD."fileId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_version_file_cleanup
AFTER DELETE ON "report_version"
FOR EACH ROW EXECUTE FUNCTION delete_detached_report_file();

CREATE FUNCTION delete_detached_artifact_file() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."fileId" IS NOT NULL THEN
    DELETE FROM "stored_file" WHERE "id" = OLD."fileId";
  ELSIF TG_OP = 'UPDATE' AND OLD."fileId" IS NOT NULL
    AND OLD."fileId" IS DISTINCT FROM NEW."fileId" THEN
    DELETE FROM "stored_file" WHERE "id" = OLD."fileId";
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER artifact_file_cleanup
AFTER DELETE OR UPDATE OF "fileId" ON "artifact"
FOR EACH ROW EXECUTE FUNCTION delete_detached_artifact_file();
