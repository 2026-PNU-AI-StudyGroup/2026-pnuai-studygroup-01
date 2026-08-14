import { getDeadlineCronSecret, isAuthorizedCronRequest } from "@/modules/notification/infrastructure/deadline-environment";
import { parseEmailEnvironment } from "@/modules/email/infrastructure/email-environment";
import { GmailOauthSmtpTransport } from "@/modules/email/infrastructure/gmail-oauth-smtp-transport";
import { PrismaEmailDeliveryWorker } from "@/modules/email/infrastructure/prisma-email-delivery-worker";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = getDeadlineCronSecret();
  } catch {
    return Response.json({ error: "이메일 작업 인증이 구성되지 않았습니다." }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }
  let environment;
  try {
    environment = parseEmailEnvironment(process.env);
  } catch {
    return Response.json({ error: "이메일 발송 환경 설정이 올바르지 않습니다." }, { status: 503 });
  }
  if (!environment.enabled) {
    return Response.json({ error: "이메일 발송이 비활성화되어 있습니다." }, { status: 503 });
  }
  try {
    const result = await new PrismaEmailDeliveryWorker(
      prisma,
      new GmailOauthSmtpTransport(environment),
      environment.APP_URL,
    ).processBatch(25);
    return Response.json(result);
  } catch {
    console.error("email_worker_unhandled");
    return Response.json({ error: "이메일 작업 처리에 실패했습니다." }, { status: 503 });
  }
}
