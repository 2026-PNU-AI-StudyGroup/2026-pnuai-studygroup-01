CREATE TYPE "RecruitmentPostStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "RecruitmentApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "recruitment_post" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "requiredSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "roleNeeded" TEXT NOT NULL,
  "availability" TEXT NOT NULL,
  "status" "RecruitmentPostStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recruitment_post_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recruitment_application" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "topicApplicationId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "RecruitmentApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recruitment_application_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recruitment_application_topicApplicationId_key" ON "recruitment_application"("topicApplicationId");
CREATE UNIQUE INDEX "recruitment_application_postId_studentId_key" ON "recruitment_application"("postId", "studentId");
CREATE INDEX "recruitment_post_status_createdAt_idx" ON "recruitment_post"("status", "createdAt");
CREATE INDEX "recruitment_post_teamId_status_idx" ON "recruitment_post"("teamId", "status");
CREATE INDEX "recruitment_application_studentId_status_idx" ON "recruitment_application"("studentId", "status");

ALTER TABLE "recruitment_post" ADD CONSTRAINT "recruitment_post_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruitment_post" ADD CONSTRAINT "recruitment_post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recruitment_application" ADD CONSTRAINT "recruitment_application_postId_fkey" FOREIGN KEY ("postId") REFERENCES "recruitment_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruitment_application" ADD CONSTRAINT "recruitment_application_topicApplicationId_fkey" FOREIGN KEY ("topicApplicationId") REFERENCES "topic_application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruitment_application" ADD CONSTRAINT "recruitment_application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
