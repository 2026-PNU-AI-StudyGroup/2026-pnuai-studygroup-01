-- 계정 없이 옮겨 넣은 지난 프로젝트의 팀원 이름.
ALTER TABLE "project_team"
  ADD COLUMN "archivedMemberNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
