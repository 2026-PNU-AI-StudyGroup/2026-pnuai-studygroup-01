ALTER TYPE "AuditAction" ADD VALUE 'TOPIC_CLOSED';

ALTER TABLE "topic_application"
ADD COLUMN "decidedById" TEXT;

ALTER TABLE "topic_application"
ADD CONSTRAINT "topic_application_decidedById_fkey"
FOREIGN KEY ("decidedById") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "topic_application_decidedById_decidedAt_idx"
ON "topic_application"("decidedById", "decidedAt");
