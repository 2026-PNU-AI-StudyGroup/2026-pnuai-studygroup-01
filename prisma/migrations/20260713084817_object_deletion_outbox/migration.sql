-- DropForeignKey
ALTER TABLE "artifact" DROP CONSTRAINT "artifact_fileId_fkey";

-- CreateTable
CREATE TABLE "object_deletion_job" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "object_deletion_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "object_deletion_job_objectKey_key" ON "object_deletion_job"("objectKey");

-- CreateIndex
CREATE INDEX "object_deletion_job_createdAt_idx" ON "object_deletion_job"("createdAt");

-- AddForeignKey
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
