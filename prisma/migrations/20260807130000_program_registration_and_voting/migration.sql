ALTER TABLE "project_program"
ADD COLUMN "projectRegistrationStartsAt" TIMESTAMP(3),
ADD COLUMN "projectRegistrationEndsAt" TIMESTAMP(3);

UPDATE "project_program"
SET
  "projectRegistrationStartsAt" = "startsAt",
  "projectRegistrationEndsAt" = "endsAt"
WHERE "projectRegistrationStartsAt" IS NULL OR "projectRegistrationEndsAt" IS NULL;

ALTER TABLE "project_program"
ALTER COLUMN "projectRegistrationStartsAt" SET NOT NULL,
ALTER COLUMN "projectRegistrationEndsAt" SET NOT NULL,
ADD CONSTRAINT "project_program_registration_period_check"
CHECK ("projectRegistrationStartsAt" < "projectRegistrationEndsAt");

CREATE TYPE "VotingIdentityVisibility" AS ENUM ('ANONYMOUS', 'NAMED');

CREATE TABLE "program_voting_policy" (
  "programId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "voteLimit" INTEGER NOT NULL,
  "selfVotingAllowed" BOOLEAN NOT NULL DEFAULT false,
  "identityVisibility" "VotingIdentityVisibility" NOT NULL DEFAULT 'ANONYMOUS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "program_voting_policy_pkey" PRIMARY KEY ("programId"),
  CONSTRAINT "program_voting_policy_period_check" CHECK ("startsAt" < "endsAt"),
  CONSTRAINT "program_voting_policy_vote_limit_check" CHECK ("voteLimit" > 0)
);

ALTER TABLE "program_voting_policy"
ADD CONSTRAINT "program_voting_policy_programId_fkey"
FOREIGN KEY ("programId") REFERENCES "project_program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "topic_id_programId_key" ON "topic"("id", "programId");

CREATE TABLE "project_vote" (
  "id" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "topicId" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_vote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_vote_programId_voterId_topicId_key" ON "project_vote"("programId", "voterId", "topicId");
CREATE INDEX "project_vote_programId_topicId_idx" ON "project_vote"("programId", "topicId");
CREATE INDEX "project_vote_programId_voterId_idx" ON "project_vote"("programId", "voterId");

ALTER TABLE "project_vote"
ADD CONSTRAINT "project_vote_programId_fkey"
FOREIGN KEY ("programId") REFERENCES "project_program"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "project_vote_topicId_programId_fkey"
FOREIGN KEY ("topicId", "programId") REFERENCES "topic"("id", "programId") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "project_vote_voterId_fkey"
FOREIGN KEY ("voterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
