CREATE TABLE "discussion_post" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "discussion_post_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "discussion_post_content_length" CHECK (char_length("content") BETWEEN 1 AND 2000)
);

CREATE INDEX "discussion_post_teamId_createdAt_idx"
ON "discussion_post"("teamId", "createdAt");

CREATE INDEX "discussion_post_authorId_idx"
ON "discussion_post"("authorId");

ALTER TABLE "discussion_post"
ADD CONSTRAINT "discussion_post_teamId_fkey"
FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discussion_post"
ADD CONSTRAINT "discussion_post_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
