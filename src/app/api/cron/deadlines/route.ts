import { GenerateDeadlineNotificationsService } from "@/modules/notification/application/manage-notifications";
import { getDeadlineCronSecret, isAuthorizedCronRequest } from "@/modules/notification/infrastructure/deadline-environment";
import { PrismaDeadlineNotificationGenerator } from "@/modules/notification/infrastructure/prisma-deadline-notification-generator";
import { finalizeExpiredPrograms } from "@/modules/project-program/infrastructure/prisma-program-lifecycle";
import { prisma } from "@/shared/infrastructure/database/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = getDeadlineCronSecret();
  } catch {
    return Response.json({ error: "마감 알림 작업이 구성되지 않았습니다." }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "인증되지 않은 요청입니다." }, { status: 401 });
  }
  const now = new Date();
  const finalizedPrograms = await finalizeExpiredPrograms(prisma, now);
  const created = await new GenerateDeadlineNotificationsService(
    new PrismaDeadlineNotificationGenerator(prisma),
  ).execute(now);
  return Response.json({ finalizedPrograms, created });
}
