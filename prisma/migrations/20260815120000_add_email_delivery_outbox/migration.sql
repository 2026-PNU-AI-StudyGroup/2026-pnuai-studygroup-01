-- CreateEnum
CREATE TYPE "EmailDeliveryKind" AS ENUM ('TEAM_INVITATION', 'PROJECT_ASSISTANT_INVITATION', 'RECRUITMENT_APPLICATION', 'RECRUITMENT_RESULT', 'TOPIC_APPLICATION', 'APPLICATION_RESULT', 'TOPIC_APPROVAL', 'PROJECT_REQUEST', 'TASK_ASSIGNMENT', 'PROJECT_MEMBERSHIP', 'DEADLINE', 'ACCOUNT_STATUS', 'PROFESSOR_ACCESS', 'REPORT_ACTIVITY', 'DISCUSSION');

-- CreateEnum
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY_WAIT', 'SENT', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "email_preference" (
    "userId" TEXT NOT NULL,
    "reportActivityEnabled" BOOLEAN NOT NULL DEFAULT false,
    "discussionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_preference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "email_delivery" (
    "id" TEXT NOT NULL,
    "kind" "EmailDeliveryKind" NOT NULL,
    "recipientUserId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "title" TEXT,
    "body" TEXT,
    "href" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_worker_lease" (
    "name" TEXT NOT NULL,
    "ownerId" TEXT,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_worker_lease_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_delivery_idempotencyKey_key" ON "email_delivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "email_delivery_status_availableAt_priority_createdAt_idx" ON "email_delivery"("status", "availableAt", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "email_delivery_sentAt_idx" ON "email_delivery"("sentAt");

-- CreateIndex
CREATE INDEX "email_delivery_recipientUserId_createdAt_idx" ON "email_delivery"("recipientUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "email_preference" ADD CONSTRAINT "email_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_delivery" ADD CONSTRAINT "email_delivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
