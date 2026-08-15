-- Preserve how a delivery was addressed even if a registered recipient is deleted
-- later (the FK intentionally uses ON DELETE SET NULL).
CREATE TYPE "EmailDeliveryRecipientType" AS ENUM ('REGISTERED', 'DIRECT');

ALTER TABLE "email_delivery"
ADD COLUMN "recipientType" "EmailDeliveryRecipientType" NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN "titleEn" TEXT,
ADD COLUMN "bodyEn" TEXT,
ADD COLUMN "lockedBy" TEXT;

UPDATE "email_delivery"
SET "recipientType" = CASE
  WHEN "recipientUserId" IS NULL THEN 'DIRECT'::"EmailDeliveryRecipientType"
  ELSE 'REGISTERED'::"EmailDeliveryRecipientType"
END;

CREATE INDEX "email_delivery_status_lockedBy_idx"
ON "email_delivery"("status", "lockedBy");
