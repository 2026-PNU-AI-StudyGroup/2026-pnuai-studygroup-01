-- CreateEnum
CREATE TYPE "TopicApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "topic_application" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "TopicApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "topic_application_studentId_status_idx" ON "topic_application"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "topic_application_topicId_studentId_key" ON "topic_application"("topicId", "studentId");

-- AddForeignKey
ALTER TABLE "topic_application" ADD CONSTRAINT "topic_application_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_application" ADD CONSTRAINT "topic_application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
