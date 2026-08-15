ALTER TABLE "stored_file"
  ALTER COLUMN "teamId" DROP NOT NULL;

ALTER TABLE "stored_file"
  ADD CONSTRAINT "stored_file_scope_consistent" CHECK (
    ("purpose" = 'ANNOUNCEMENT' AND "teamId" IS NULL)
    OR ("purpose" <> 'ANNOUNCEMENT' AND "teamId" IS NOT NULL)
  ),
  ADD CONSTRAINT "stored_file_purpose_consumer_consistent" CHECK (
    ("purpose" = 'REPORT' AND "consumer" = 'REPORT')
    OR ("purpose" = 'ARTIFACT' AND "consumer" = 'ARTIFACT')
    OR ("purpose" = 'ANNOUNCEMENT' AND "consumer" = 'ANNOUNCEMENT')
  );

CREATE TABLE "announcement_attachment" (
  "fileId" TEXT NOT NULL,
  "announcementId" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "announcement_attachment_pkey" PRIMARY KEY ("fileId"),
  CONSTRAINT "announcement_attachment_position_nonnegative" CHECK ("position" >= 0)
);

CREATE UNIQUE INDEX "announcement_attachment_announcementId_position_key"
  ON "announcement_attachment"("announcementId", "position");
CREATE INDEX "announcement_attachment_uploadedById_idx"
  ON "announcement_attachment"("uploadedById");

ALTER TABLE "announcement_attachment"
  ADD CONSTRAINT "announcement_attachment_fileId_fkey"
    FOREIGN KEY ("fileId") REFERENCES "stored_file"("id")
    ON DELETE NO ACTION ON UPDATE CASCADE,
  ADD CONSTRAINT "announcement_attachment_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "announcement"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "announcement_attachment_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "announcement_attachment"
  ALTER CONSTRAINT "announcement_attachment_fileId_fkey" DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION attach_announcement_file() RETURNS trigger AS $$
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
    AND "teamId" IS NULL
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

CREATE TRIGGER announcement_attachment_file_attachment
BEFORE INSERT ON "announcement_attachment"
FOR EACH ROW EXECUTE FUNCTION attach_announcement_file();

CREATE FUNCTION prevent_announcement_attachment_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'announcement attachments are immutable; delete and recreate the relation'
    USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER announcement_attachment_immutability
BEFORE UPDATE ON "announcement_attachment"
FOR EACH ROW EXECUTE FUNCTION prevent_announcement_attachment_update();

CREATE FUNCTION delete_detached_announcement_file() RETURNS trigger AS $$
BEGIN
  DELETE FROM "stored_file" WHERE "id" = OLD."fileId";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER announcement_attachment_file_cleanup
AFTER DELETE ON "announcement_attachment"
FOR EACH ROW EXECUTE FUNCTION delete_detached_announcement_file();
