-- DropForeignKey
ALTER TABLE "topic_approval_request" DROP CONSTRAINT "topic_approval_request_decidedById_fkey";

-- DropForeignKey
ALTER TABLE "topic_approval_request" DROP CONSTRAINT "topic_approval_request_requestedProfessorId_fkey";

-- AlterTable
ALTER TABLE "report" ADD COLUMN     "score" INTEGER,
ADD COLUMN     "scoreComment" TEXT,
ADD COLUMN     "scoredAt" TIMESTAMP(3),
ADD COLUMN     "scoredById" TEXT;

-- CreateTable
CREATE TABLE "report_feedback" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_feedback_reportId_createdAt_idx" ON "report_feedback"("reportId", "createdAt");

-- AddForeignKey
ALTER TABLE "topic_approval_request" ADD CONSTRAINT "topic_approval_request_requestedProfessorId_fkey" FOREIGN KEY ("requestedProfessorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_approval_request" ADD CONSTRAINT "topic_approval_request_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_scoredById_fkey" FOREIGN KEY ("scoredById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_feedback" ADD CONSTRAINT "report_feedback_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_feedback" ADD CONSTRAINT "report_feedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
