ALTER TABLE "team"
DROP CONSTRAINT "team_academicCycleId_fkey",
DROP CONSTRAINT "team_topicId_fkey",
DROP CONSTRAINT "team_professorId_fkey";

CREATE UNIQUE INDEX "topic_id_academicCycleId_authorId_key"
ON "topic"("id", "academicCycleId", "authorId");

CREATE UNIQUE INDEX "team_topicId_academicCycleId_professorId_key"
ON "team"("topicId", "academicCycleId", "professorId");

ALTER TABLE "team"
ADD CONSTRAINT "team_topicId_academicCycleId_professorId_fkey"
FOREIGN KEY ("topicId", "academicCycleId", "professorId")
REFERENCES "topic"("id", "academicCycleId", "authorId")
ON DELETE RESTRICT ON UPDATE CASCADE;
