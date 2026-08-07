-- CreateTable
CREATE TABLE "feedback_status_change" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL,
    "changedByName" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_status_change_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_status_change_postId_createdAt_idx" ON "feedback_status_change"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "feedback_status_change" ADD CONSTRAINT "feedback_status_change_postId_fkey" FOREIGN KEY ("postId") REFERENCES "feedback_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
