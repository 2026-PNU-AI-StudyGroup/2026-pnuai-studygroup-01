-- CreateEnum
CREATE TYPE "StoredFileStatus" AS ENUM ('PENDING', 'READY', 'ATTACHED');

-- CreateEnum
CREATE TYPE "FilePurpose" AS ENUM ('REPORT', 'ARTIFACT');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('START', 'MIDTERM', 'FINAL');

-- CreateEnum
CREATE TYPE "ApprovalDecisionType" AS ENUM ('APPROVED', 'REVISION_REQUESTED');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('PRESENTATION_VIDEO', 'SOURCE_CODE', 'POSTER', 'OTHER');

-- CreateTable
CREATE TABLE "stored_file" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "purpose" "FilePurpose" NOT NULL,
    "status" "StoredFileStatus" NOT NULL DEFAULT 'PENDING',
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),

    CONSTRAINT "stored_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_version" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_decision" (
    "id" TEXT NOT NULL,
    "reportVersionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ApprovalDecisionType" NOT NULL,
    "comment" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artifact" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "registeredById" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "title" TEXT NOT NULL,
    "fileId" TEXT,
    "externalUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stored_file_objectKey_key" ON "stored_file"("objectKey");

-- CreateIndex
CREATE INDEX "stored_file_teamId_status_idx" ON "stored_file"("teamId", "status");

-- CreateIndex
CREATE INDEX "stored_file_status_expiresAt_idx" ON "stored_file"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "report_teamId_type_key" ON "report"("teamId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "report_version_fileId_key" ON "report_version"("fileId");

-- CreateIndex
CREATE INDEX "report_version_submitterId_idx" ON "report_version"("submitterId");

-- CreateIndex
CREATE UNIQUE INDEX "report_version_reportId_version_key" ON "report_version"("reportId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "approval_decision_reportVersionId_key" ON "approval_decision"("reportVersionId");

-- CreateIndex
CREATE INDEX "approval_decision_reviewerId_idx" ON "approval_decision"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "artifact_fileId_key" ON "artifact"("fileId");

-- CreateIndex
CREATE INDEX "artifact_teamId_createdAt_idx" ON "artifact"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_version" ADD CONSTRAINT "report_version_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_version" ADD CONSTRAINT "report_version_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_version" ADD CONSTRAINT "report_version_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decision" ADD CONSTRAINT "approval_decision_reportVersionId_fkey" FOREIGN KEY ("reportVersionId") REFERENCES "report_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decision" ADD CONSTRAINT "approval_decision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artifact" ADD CONSTRAINT "artifact_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;
