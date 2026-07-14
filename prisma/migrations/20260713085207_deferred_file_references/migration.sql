-- DropForeignKey
ALTER TABLE "artifact" DROP CONSTRAINT "artifact_fileId_fkey";

-- DropForeignKey
ALTER TABLE "report_version" DROP CONSTRAINT "report_version_fileId_fkey";

-- AddForeignKey
ALTER TABLE "report_version" ADD CONSTRAINT "report_version_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_file"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_file"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
