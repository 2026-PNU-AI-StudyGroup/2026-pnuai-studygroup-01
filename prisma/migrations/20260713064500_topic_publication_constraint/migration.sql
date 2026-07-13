ALTER TABLE "topic"
ADD CONSTRAINT "topic_publication_consistent" CHECK (
  ("status" = 'DRAFT' AND "publishedAt" IS NULL)
  OR ("status" IN ('PUBLISHED', 'CLOSED') AND "publishedAt" IS NOT NULL)
);
