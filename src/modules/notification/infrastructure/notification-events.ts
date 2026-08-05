import type { Prisma } from "@/generated/prisma/client";

type NotificationTransaction = Pick<Prisma.TransactionClient, "notification">;

export function createApplicationResultNotification(
  transaction: NotificationTransaction,
  input: {
    applicationId: string;
    recipientId: string;
    topicTitle: string;
    outcome: "ACCEPTED" | "REJECTED";
    createdAt: Date;
  },
) {
  return createApplicationResultNotifications(transaction, [input]);
}

export function createApplicationResultNotifications(
  transaction: NotificationTransaction,
  inputs: Array<{
    applicationId: string;
    recipientId: string;
    topicTitle: string;
    outcome: "ACCEPTED" | "REJECTED";
    createdAt: Date;
  }>,
) {
  if (!inputs.length) return Promise.resolve({ count: 0 });
  return transaction.notification.createMany({
    data: inputs.map((input) => ({
      recipientId: input.recipientId,
      type: "APPLICATION_RESULT",
      title: input.outcome === "ACCEPTED" ? "프로젝트 참여가 확정되었습니다" : "프로젝트 지원 결과가 도착했습니다",
      body: input.outcome === "ACCEPTED"
        ? `${input.topicTitle} 프로젝트 팀에 합류했습니다. 팀 공간에서 다음 일정을 확인해 주세요.`
        : `${input.topicTitle} 지원이 이번 팀 구성에는 반영되지 않았습니다. 다른 공개 주제도 계속 탐색할 수 있습니다.`,
      href: input.outcome === "ACCEPTED" ? "/dashboard" : "/topics?view=active",
      dedupeKey: `application:${input.applicationId}:${input.outcome}`,
      createdAt: input.createdAt,
    })),
    skipDuplicates: true,
  });
}

export function createReportActivityNotifications(
  transaction: NotificationTransaction,
  inputs: Array<{
    dedupeKey: string;
    recipientId: string;
    title: string;
    body: string;
    href: string;
    createdAt: Date;
  }>,
) {
  if (!inputs.length) return Promise.resolve({ count: 0 });
  return transaction.notification.createMany({
    data: inputs.map((input) => ({ ...input, type: "REPORT_ACTIVITY" as const })),
    skipDuplicates: true,
  });
}

export function createProjectRequestNotifications(
  transaction: NotificationTransaction,
  inputs: Array<{
    dedupeKey: string;
    recipientId: string;
    title: string;
    body: string;
    href: string;
    createdAt: Date;
  }>,
) {
  if (!inputs.length) return Promise.resolve({ count: 0 });
  return transaction.notification.createMany({
    data: inputs.map((input) => ({ ...input, type: "PROJECT_REQUEST" as const })),
    skipDuplicates: true,
  });
}

export function createDiscussionNotifications(
  transaction: NotificationTransaction,
  inputs: Array<{
    dedupeKey: string;
    recipientId: string;
    title: string;
    body: string;
    href: string;
    createdAt: Date;
  }>,
) {
  if (!inputs.length) return Promise.resolve({ count: 0 });
  return transaction.notification.createMany({
    data: inputs.map((input) => ({ ...input, type: "DISCUSSION" as const })),
    skipDuplicates: true,
  });
}
