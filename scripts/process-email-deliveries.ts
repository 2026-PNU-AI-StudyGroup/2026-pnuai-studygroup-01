import "dotenv/config";

import { parseEmailEnvironment } from "../src/modules/email/infrastructure/email-environment";
import { GmailOauthSmtpTransport } from "../src/modules/email/infrastructure/gmail-oauth-smtp-transport";
import { PrismaEmailDeliveryWorker } from "../src/modules/email/infrastructure/prisma-email-delivery-worker";
import { prisma } from "../src/shared/infrastructure/database/prisma";

async function main() {
  const environment = parseEmailEnvironment(process.env);
  if (!environment.enabled) throw new Error("EMAIL_DELIVERY_ENABLED=true 설정이 필요합니다.");
  const result = await new PrismaEmailDeliveryWorker(
    prisma,
    new GmailOauthSmtpTransport(environment),
    environment.APP_URL,
  ).processBatch(25);
  console.log(JSON.stringify(result));
}

main()
  .finally(() => prisma.$disconnect())
  .catch(() => {
    console.error("email_delivery_process_failed");
    process.exitCode = 1;
  });
