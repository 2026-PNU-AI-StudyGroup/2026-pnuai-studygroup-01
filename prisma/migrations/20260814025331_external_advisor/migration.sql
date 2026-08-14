-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADVISOR';

-- AlterTable
ALTER TABLE "program_voting_policy" ADD COLUMN     "staffVoteLimit" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "advisor_access_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_access_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_advisor" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_advisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisor_evaluation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "rubricId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisor_score" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisor_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advisor_feedback" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "advisor_access_token_tokenHash_key" ON "advisor_access_token"("tokenHash");

-- CreateIndex
CREATE INDEX "advisor_access_token_userId_createdAt_idx" ON "advisor_access_token"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "project_advisor_userId_createdAt_idx" ON "project_advisor"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_advisor_topicId_userId_key" ON "project_advisor"("topicId", "userId");

-- CreateIndex
CREATE INDEX "advisor_evaluation_teamId_idx" ON "advisor_evaluation"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "advisor_evaluation_teamId_advisorId_rubricId_key" ON "advisor_evaluation"("teamId", "advisorId", "rubricId");

-- CreateIndex
CREATE UNIQUE INDEX "advisor_score_evaluationId_criterionId_key" ON "advisor_score"("evaluationId", "criterionId");

-- CreateIndex
CREATE INDEX "advisor_feedback_teamId_createdAt_idx" ON "advisor_feedback"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "advisor_access_token" ADD CONSTRAINT "advisor_access_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_advisor" ADD CONSTRAINT "project_advisor_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_advisor" ADD CONSTRAINT "project_advisor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_advisor" ADD CONSTRAINT "project_advisor_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_evaluation" ADD CONSTRAINT "advisor_evaluation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_evaluation" ADD CONSTRAINT "advisor_evaluation_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_evaluation" ADD CONSTRAINT "advisor_evaluation_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "rubric_definition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_score" ADD CONSTRAINT "advisor_score_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "advisor_evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_score" ADD CONSTRAINT "advisor_score_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "rubric_criterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_feedback" ADD CONSTRAINT "advisor_feedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advisor_feedback" ADD CONSTRAINT "advisor_feedback_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
