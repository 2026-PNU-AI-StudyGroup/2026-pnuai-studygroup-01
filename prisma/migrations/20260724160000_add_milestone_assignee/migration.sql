ALTER TABLE "milestone"
ADD COLUMN "assignedToId" TEXT;

CREATE INDEX "milestone_assignedToId_idx"
ON "milestone"("assignedToId");

ALTER TABLE "milestone"
ADD CONSTRAINT "milestone_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
