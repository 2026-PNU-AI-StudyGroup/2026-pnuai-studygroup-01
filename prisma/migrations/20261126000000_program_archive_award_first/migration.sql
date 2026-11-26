-- 지난 프로젝트 목록 차례. 기본은 지금처럼 수상 팀 먼저, 끄면 팀 번호순이다.
ALTER TABLE "project_program"
  ADD COLUMN "archiveAwardFirst" BOOLEAN NOT NULL DEFAULT true;
