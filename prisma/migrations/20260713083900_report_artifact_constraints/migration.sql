ALTER TABLE "stored_file"
ADD CONSTRAINT "stored_file_name_length" CHECK (
  length(btrim("originalName")) BETWEEN 1 AND 255
),
ADD CONSTRAINT "stored_file_content_type_length" CHECK (
  length(btrim("contentType")) BETWEEN 1 AND 100
),
ADD CONSTRAINT "stored_file_size_range" CHECK (
  "size" BETWEEN 1 AND 1073741824
),
ADD CONSTRAINT "stored_file_sha256_format" CHECK (
  "sha256" ~ '^[0-9a-f]{64}$'
);

ALTER TABLE "report_version"
ADD CONSTRAINT "report_version_positive" CHECK ("version" > 0),
ADD CONSTRAINT "report_version_description_length" CHECK (
  length("description") <= 2000
);

ALTER TABLE "approval_decision"
ADD CONSTRAINT "approval_decision_comment_length" CHECK (
  length("comment") <= 2000
),
ADD CONSTRAINT "approval_revision_comment_required" CHECK (
  "decision" = 'APPROVED' OR length(btrim("comment")) > 0
);

ALTER TABLE "artifact"
ADD CONSTRAINT "artifact_title_length" CHECK (
  length(btrim("title")) BETWEEN 1 AND 200
),
ADD CONSTRAINT "artifact_exactly_one_source" CHECK (
  ("fileId" IS NOT NULL) <> ("externalUrl" IS NOT NULL)
),
ADD CONSTRAINT "artifact_external_url_length" CHECK (
  "externalUrl" IS NULL OR length("externalUrl") <= 2048
);
