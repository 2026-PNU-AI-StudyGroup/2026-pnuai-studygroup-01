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
      title: input.outcome === "ACCEPTED" ? "프로젝트 참여가 확정되었습니다" : "프로젝트 지원 결과 안내",
      body: input.outcome === "ACCEPTED"
        ? `${input.topicTitle} 프로젝트 참여가 확정되었습니다. 프로젝트 화면에서 일정을 확인해 주세요.`
        : `${input.topicTitle} 프로젝트에 선정되지 않았습니다. 검토 의견을 확인해 주세요.`,
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

export function createTopicApprovalNotification(
  transaction: NotificationTransaction,
  input: {
    dedupeKey: string;
    recipientId: string;
    title: string;
    body: string;
    href: string;
    createdAt: Date;
  },
) {
  return transaction.notification.createMany({
    data: [{ ...input, type: "TOPIC_APPROVAL" as const }],
    skipDuplicates: true,
  });
}
