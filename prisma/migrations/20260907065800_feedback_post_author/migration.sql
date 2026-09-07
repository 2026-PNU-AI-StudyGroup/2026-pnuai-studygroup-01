-- AlterTable
ALTER TABLE "feedback_post" ADD COLUMN     "authorEmail" TEXT,
ADD COLUMN     "authorId" TEXT;

-- AddForeignKey
ALTER TABLE "feedback_post" ADD CONSTRAINT "feedback_post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
