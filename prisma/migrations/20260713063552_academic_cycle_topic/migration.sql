-- CreateEnum
CREATE TYPE "AcademicTerm" AS ENUM ('FIRST', 'SECOND');

-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateTable
CREATE TABLE "academic_cycle" (
    "id" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "term" "AcademicTerm" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic" (
    "id" TEXT NOT NULL,
    "academicCycleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "recruitmentStartsAt" TIMESTAMP(3) NOT NULL,
    "recruitmentEndsAt" TIMESTAMP(3) NOT NULL,
    "executionStartsAt" TIMESTAMP(3) NOT NULL,
    "executionEndsAt" TIMESTAMP(3) NOT NULL,
    "submissionStartsAt" TIMESTAMP(3) NOT NULL,
    "submissionEndsAt" TIMESTAMP(3) NOT NULL,
    "status" "TopicStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_cycle_academicYear_term_key" ON "academic_cycle"("academicYear", "term");

-- CreateIndex
CREATE INDEX "topic_academicCycleId_status_idx" ON "topic"("academicCycleId", "status");

-- CreateIndex
CREATE INDEX "topic_authorId_idx" ON "topic"("authorId");

-- AddForeignKey
ALTER TABLE "topic" ADD CONSTRAINT "topic_academicCycleId_fkey" FOREIGN KEY ("academicCycleId") REFERENCES "academic_cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic" ADD CONSTRAINT "topic_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
