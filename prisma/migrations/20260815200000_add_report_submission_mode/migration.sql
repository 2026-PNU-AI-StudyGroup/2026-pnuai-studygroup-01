ALTER TABLE "program_report_definition"
ADD COLUMN "required" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "report"
ADD COLUMN "submissionEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Before optional reports existed, required=false meant the definition had been archived.
UPDATE "report"
SET "submissionEnabled" = false
WHERE "required" = false;

ALTER TYPE "AuditAction" ADD VALUE 'PROGRAM_REPORT_DEFINITION_DELETED';
