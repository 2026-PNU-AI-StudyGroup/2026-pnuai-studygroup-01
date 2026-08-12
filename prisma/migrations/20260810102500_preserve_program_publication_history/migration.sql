-- Preserve the only authoritative legacy publication timestamp before the
-- lifecycle migration removes project_program.openedAt.
ALTER TABLE "project_program"
  ADD COLUMN IF NOT EXISTS "firstPublishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

DO $$
DECLARE
  invalid_publication_count BIGINT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_program'
      AND column_name = 'status'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_program'
      AND column_name = 'openedAt'
  ) THEN
    EXECUTE $query$
      SELECT count(*)
      FROM "project_program"
      WHERE "status"::text IN ('OPEN', 'CLOSED')
        AND "openedAt" IS NULL
    $query$ INTO invalid_publication_count;

    IF invalid_publication_count > 0 THEN
      RAISE EXCEPTION
        'Cannot preserve publication history: % public or closed programs have no openedAt',
        invalid_publication_count;
    END IF;

    EXECUTE $migration$
      UPDATE "project_program"
      SET "firstPublishedAt" = "openedAt"
      WHERE "firstPublishedAt" IS NULL
        AND "status"::text IN ('OPEN', 'CLOSED')
    $migration$;
  END IF;
END $$;

-- Legacy status did not carry an authoritative closure timestamp. closedAt
-- intentionally remains NULL for those rows instead of guessing from endsAt
-- or updatedAt; all future closures record it transactionally.
