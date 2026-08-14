import type { Prisma } from "@/generated/prisma/client";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";

type NotificationTransaction = Pick<Prisma.TransactionClient, "notification" | "user" | "emailDelivery">;

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

export async function createApplicationResultNotifications(
  transaction: NotificationTransaction,
  inputs: Array<{
    applicationId: string;
    recipientId: string;
    topicTitle: string;
    outcome: "ACCEPTED" | "REJECTED";
    createdAt: Date;
  }>,
) {
  if (!inputs.length) return { count: 0 };
  await enqueueEmailEvents(transaction, inputs.map((input) => ({
    kind: "APPLICATION_RESULT" as const,
    recipientId: input.recipientId,
    title: input.outcome === "ACCEPTED" ? "프로젝트 참여가 확정되었습니다" : "프로젝트 지원 결과 안내",
    body: input.outcome === "ACCEPTED"
      ? `${input.topicTitle} 프로젝트 참여가 확정되었습니다. 프로젝트 화면에서 일정을 확인해 주세요.`
      : `${input.topicTitle} 프로젝트에 선정되지 않았습니다. 검토 의견을 확인해 주세요.`,
    titleEn: input.outcome === "ACCEPTED" ? "Project participation confirmed" : "Project application result",
    bodyEn: input.outcome === "ACCEPTED"
      ? `Your participation in ${input.topicTitle} has been confirmed. Check the project workspace for the schedule.`
      : `You were not selected for ${input.topicTitle}. Review the decision details in PMS.`,
    href: input.outcome === "ACCEPTED" ? "/dashboard" : "/topics?view=active",
    idempotencyKey: `email:application:${input.applicationId}:${input.outcome}`,
    createdAt: input.createdAt,
  })));
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

export async function createReportActivityNotifications(
  transaction: NotificationTransaction,
  inputs: Array<{
    dedupeKey: string;
    recipientId: string;
    title: string;
    body: string;
    titleEn: string;
    bodyEn: string;
    href: string;
    createdAt: Date;
  }>,
) {
  if (!inputs.length) return { count: 0 };
  await enqueueEmailEvents(transaction, inputs.map((input) => ({
    kind: "REPORT_ACTIVITY" as const,
    recipientId: input.recipientId,
    title: input.title,
    body: input.body,
    titleEn: input.titleEn,
    bodyEn: input.bodyEn,
    href: input.href,
    idempotencyKey: `email:${input.dedupeKey}`,
    createdAt: input.createdAt,
  })));
  return transaction.notification.createMany({
    data: inputs.map((input) => ({
      recipientId: input.recipientId,
      title: input.title,
      body: input.body,
      href: input.href,
      dedupeKey: input.dedupeKey,
      createdAt: input.createdAt,
      type: "REPORT_ACTIVITY" as const,
    })),
    skipDuplicates: true,
  });
}

export async function createProjectRequestNotifications(
  transaction: NotificationTransaction,
  inputs: Array<{
    dedupeKey: string;
    recipientId: string;
    title: string;
    body: string;
    titleEn: string;
    bodyEn: string;
    href: string;
    createdAt: Date;
  }>,
) {
  if (!inputs.length) return { count: 0 };
  await enqueueEmailEvents(transaction, inputs.map((input) => ({
    kind: "PROJECT_REQUEST" as const,
    recipientId: input.recipientId,
    title: input.title,
    body: input.body,
    titleEn: input.titleEn,
    bodyEn: input.bodyEn,
    href: input.href,
    idempotencyKey: `email:${input.dedupeKey}`,
    createdAt: input.createdAt,
  })));
  return transaction.notification.createMany({
    data: inputs.map((input) => ({
      recipientId: input.recipientId,
      title: input.title,
      body: input.body,
      href: input.href,
      dedupeKey: input.dedupeKey,
      createdAt: input.createdAt,
      type: "PROJECT_REQUEST" as const,
    })),
    skipDuplicates: true,
  });
}

export async function createDiscussionNotifications(
  transaction: NotificationTransaction,
  inputs: Array<{
    dedupeKey: string;
    recipientId: string;
    title: string;
    body: string;
    titleEn: string;
    bodyEn: string;
    href: string;
    createdAt: Date;
  }>,
) {
  if (!inputs.length) return { count: 0 };
  await enqueueEmailEvents(transaction, inputs.map((input) => ({
    kind: "DISCUSSION" as const,
    recipientId: input.recipientId,
    title: input.title,
    body: input.body,
    titleEn: input.titleEn,
    bodyEn: input.bodyEn,
    href: input.href,
    idempotencyKey: `email:${input.dedupeKey}`,
    createdAt: input.createdAt,
  })));
  return transaction.notification.createMany({
    data: inputs.map((input) => ({
      recipientId: input.recipientId,
      title: input.title,
      body: input.body,
      href: input.href,
      dedupeKey: input.dedupeKey,
      createdAt: input.createdAt,
      type: "DISCUSSION" as const,
    })),
    skipDuplicates: true,
  });
}

export async function createTopicApprovalNotification(
  transaction: NotificationTransaction,
  input: {
    dedupeKey: string;
    recipientId: string;
    title: string;
    body: string;
    titleEn: string;
    bodyEn: string;
    href: string;
    createdAt: Date;
  },
) {
  await enqueueEmailEvents(transaction, [{
    kind: "TOPIC_APPROVAL",
    recipientId: input.recipientId,
    title: input.title,
    body: input.body,
    titleEn: input.titleEn,
    bodyEn: input.bodyEn,
    href: input.href,
    idempotencyKey: `email:${input.dedupeKey}`,
    createdAt: input.createdAt,
  }]);
  return transaction.notification.createMany({
    data: [{
      recipientId: input.recipientId,
      title: input.title,
      body: input.body,
      href: input.href,
      dedupeKey: input.dedupeKey,
      createdAt: input.createdAt,
      type: "TOPIC_APPROVAL" as const,
    }],
    skipDuplicates: true,
  });
}
