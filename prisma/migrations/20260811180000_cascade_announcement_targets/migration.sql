-- Targeted notices have no valid audience after their team or program is removed.
ALTER TABLE "announcement"
DROP CONSTRAINT "announcement_teamId_fkey",
ADD CONSTRAINT "announcement_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "team"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "announcement"
DROP CONSTRAINT "announcement_programId_fkey",
ADD CONSTRAINT "announcement_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "project_program"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
