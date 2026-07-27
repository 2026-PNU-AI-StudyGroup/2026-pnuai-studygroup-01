CREATE TABLE "announcement" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "announcement_createdAt_idx" ON "announcement"("createdAt");
CREATE INDEX "announcement_authorId_idx" ON "announcement"("authorId");

ALTER TABLE "announcement"
ADD CONSTRAINT "announcement_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
