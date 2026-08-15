-- Preserve the explicit account-status notification exception until dispatch.
-- Every other registered recipient is revalidated by the worker before SMTP.
ALTER TABLE "email_delivery"
ADD COLUMN "allowInactiveRecipient" BOOLEAN NOT NULL DEFAULT false;
