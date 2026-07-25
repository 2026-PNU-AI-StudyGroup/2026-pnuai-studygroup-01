CREATE TABLE "milestone_assignee" (
    "milestoneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_assignee_pkey" PRIMARY KEY ("milestoneId", "userId")
);

INSERT INTO "milestone_assignee" ("milestoneId", "userId")
SELECT "id", "assignedToId"
FROM "milestone"
WHERE "assignedToId" IS NOT NULL;

CREATE INDEX "milestone_assignee_userId_idx"
ON "milestone_assignee"("userId");

ALTER TABLE "milestone_assignee"
ADD CONSTRAINT "milestone_assignee_milestoneId_fkey"
FOREIGN KEY ("milestoneId") REFERENCES "milestone"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "milestone_assignee"
ADD CONSTRAINT "milestone_assignee_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "milestone" DROP CONSTRAINT "milestone_assignedToId_fkey";
DROP INDEX "milestone_assignedToId_idx";
ALTER TABLE "milestone" DROP COLUMN "assignedToId";
