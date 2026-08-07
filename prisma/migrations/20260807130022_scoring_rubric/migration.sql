-- CreateTable
CREATE TABLE "rubric_criterion" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maxPoints" INTEGER NOT NULL DEFAULT 10,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rubric_criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_rubric_score" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "scoredByName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_rubric_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_rubric_release" (
    "reportId" TEXT NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedByName" TEXT NOT NULL,

    CONSTRAINT "report_rubric_release_pkey" PRIMARY KEY ("reportId")
);

-- CreateIndex
CREATE INDEX "rubric_criterion_programId_position_idx" ON "rubric_criterion"("programId", "position");

-- CreateIndex
CREATE INDEX "report_rubric_score_reportId_idx" ON "report_rubric_score"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "report_rubric_score_reportId_criterionId_key" ON "report_rubric_score"("reportId", "criterionId");

-- AddForeignKey
ALTER TABLE "rubric_criterion" ADD CONSTRAINT "rubric_criterion_programId_fkey" FOREIGN KEY ("programId") REFERENCES "project_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_rubric_score" ADD CONSTRAINT "report_rubric_score_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_rubric_score" ADD CONSTRAINT "report_rubric_score_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "rubric_criterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_rubric_release" ADD CONSTRAINT "report_rubric_release_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
