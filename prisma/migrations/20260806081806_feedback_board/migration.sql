-- CreateEnum
CREATE TYPE "FeedbackTargetScreen" AS ENUM ('STUDENT', 'PROFESSOR', 'ADMIN', 'COMMON');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('FEATURE', 'BUG');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "feedback_post" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "targetScreen" "FeedbackTargetScreen" NOT NULL,
    "area" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "developerName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_post_status_createdAt_idx" ON "feedback_post"("status", "createdAt");

-- CreateIndex
CREATE INDEX "feedback_comment_postId_createdAt_idx" ON "feedback_comment"("postId", "createdAt");

-- AddForeignKey
ALTER TABLE "feedback_comment" ADD CONSTRAINT "feedback_comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "feedback_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
