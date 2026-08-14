ALTER TABLE "program_voting_policy"
ADD COLUMN "resultsVisibleDuringVoting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "resultsVisibleAfterVoting" BOOLEAN NOT NULL DEFAULT true;
