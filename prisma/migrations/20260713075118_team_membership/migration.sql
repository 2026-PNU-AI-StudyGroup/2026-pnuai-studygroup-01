-- CreateEnum
CREATE TYPE "TeamStatus" AS ENUM ('FORMING', 'CONFIRMED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('MEMBER', 'LEADER');

-- CreateTable
CREATE TABLE "team" (
    "id" TEXT NOT NULL,
    "academicCycleId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TeamStatus" NOT NULL DEFAULT 'FORMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_member" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "academicCycleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_topicId_key" ON "team"("topicId");

-- CreateIndex
CREATE INDEX "team_academicCycleId_status_idx" ON "team"("academicCycleId", "status");

-- CreateIndex
CREATE INDEX "team_professorId_idx" ON "team"("professorId");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_applicationId_key" ON "team_member"("applicationId");

-- CreateIndex
CREATE INDEX "team_member_studentId_idx" ON "team_member"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_teamId_studentId_key" ON "team_member"("teamId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "team_member_academicCycleId_studentId_key" ON "team_member"("academicCycleId", "studentId");

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_academicCycleId_fkey" FOREIGN KEY ("academicCycleId") REFERENCES "academic_cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_academicCycleId_fkey" FOREIGN KEY ("academicCycleId") REFERENCES "academic_cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "topic_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
