CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_RESULT', 'REPORT_ACTIVITY', 'DEADLINE', 'SYSTEM');

CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_dedupeKey_key" ON "notification"("dedupeKey");
CREATE INDEX "notification_recipientId_readAt_createdAt_idx" ON "notification"("recipientId", "readAt", "createdAt");

ALTER TABLE "notification" ADD CONSTRAINT "notification_recipientId_fkey"
FOREIGN KEY ("recipientId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
