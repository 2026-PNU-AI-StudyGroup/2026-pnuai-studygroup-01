ALTER TABLE "project_program"
  ADD COLUMN "projectTeamMinSize" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "projectTeamMaxSize" INTEGER NOT NULL DEFAULT 6;

ALTER TABLE "project_program"
  ADD CONSTRAINT "project_program_team_size_policy_check"
  CHECK (
    "projectTeamMinSize" >= 1
    AND "projectTeamMaxSize" >= "projectTeamMinSize"
    AND "projectTeamMaxSize" <= 100
  );
