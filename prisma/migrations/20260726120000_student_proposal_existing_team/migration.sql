ALTER TABLE "topic"
ADD COLUMN "recruitmentEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "topic_approval_request"
ADD COLUMN "studentTeamId" TEXT;

CREATE INDEX "topic_approval_request_studentTeamId_idx"
ON "topic_approval_request"("studentTeamId");

ALTER TABLE "topic_approval_request"
ADD CONSTRAINT "topic_approval_request_studentTeamId_fkey"
FOREIGN KEY ("studentTeamId") REFERENCES "student_team"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
