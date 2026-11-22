-- 심사 집계 환산 점수에서 내부 심사가 차지하는 비율(%). 나머지는 자문위원 평균이다.
ALTER TABLE "project_program"
  ADD COLUMN "scoreboardStaffWeight" INTEGER NOT NULL DEFAULT 50;

ALTER TABLE "project_program"
  ADD CONSTRAINT "project_program_scoreboard_staff_weight_range"
  CHECK ("scoreboardStaffWeight" BETWEEN 0 AND 100);
