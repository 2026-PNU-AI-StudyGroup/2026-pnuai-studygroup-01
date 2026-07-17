import type { PrismaClient } from "@/generated/prisma/client";
import type { DeadlineNotificationGenerator, NotificationPage, NotificationRepository } from "@/modules/notification/application/notification-ports";

type NotificationCreateInput = {
  recipientId: string;
  type: "DEADLINE";
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
  createdAt: Date;
};

export class PrismaNotificationRepository implements NotificationRepository, DeadlineNotificationGenerator {
  constructor(private readonly client: PrismaClient) {}

  async list(recipientId: string, requestedPage: number, pageSize: number): Promise<NotificationPage> {
    const total = await this.client.notification.count({ where: { recipientId } });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const [items, unreadCount] = await Promise.all([
      this.client.notification.findMany({
        where: { recipientId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
      }),
      this.countUnread(recipientId),
    ]);
    return { items, unreadCount, page, totalPages, total };
  }

  countUnread(recipientId: string) {
    return this.client.notification.count({ where: { recipientId, readAt: null } });
  }

  async markRead(recipientId: string, notificationId: string, readAt: Date): Promise<string | null> {
    return this.client.$transaction(async (transaction) => {
      const notification = await transaction.notification.findFirst({
        where: { id: notificationId, recipientId },
        select: { href: true, readAt: true },
      });
      if (!notification) return null;
      if (!notification.readAt) {
        await transaction.notification.update({ where: { id: notificationId }, data: { readAt } });
      }
      return notification.href;
    });
  }

  markAllRead(recipientId: string, readAt: Date) {
    return this.client.notification.updateMany({ where: { recipientId, readAt: null }, data: { readAt } }).then(({ count }) => count);
  }

  async generate(now: Date, endsAt: Date): Promise<number> {
    const [teams, milestones, reports] = await Promise.all([
      this.client.team.findMany({
        where: {
          status: { not: "CLOSED" },
          OR: [
            { topic: { executionEndsAt: { gte: now, lte: endsAt } } },
            { topic: { submissionEndsAt: { gte: now, lte: endsAt } } },
          ],
        },
        select: {
          id: true,
          name: true,
          professorId: true,
          members: { select: { studentId: true } },
          topic: { select: { executionEndsAt: true, submissionEndsAt: true } },
        },
      }),
      this.client.milestone.findMany({
        where: { status: { not: "DONE" }, dueAt: { gte: now, lte: endsAt }, team: { status: { not: "CLOSED" } } },
        select: {
          id: true,
          title: true,
          dueAt: true,
          team: { select: { id: true, name: true, professorId: true, members: { select: { studentId: true } } } },
        },
      }),
      this.client.report.findMany({
        where: { dueAt: { gte: now, lte: endsAt }, team: { status: "CONFIRMED" } },
        select: {
          id: true,
          type: true,
          dueAt: true,
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            select: { decision: { select: { decision: true } } },
          },
          team: { select: { id: true, name: true, professorId: true, members: { select: { studentId: true } } } },
        },
      }),
    ]);

    const rows: NotificationCreateInput[] = [];
    for (const team of teams) {
      const recipients = new Set([team.professorId, ...team.members.map(({ studentId }) => studentId)]);
      const deadlines = [
        ["수행 종료", team.topic.executionEndsAt, "execution"],
        ["결과물 제출", team.topic.submissionEndsAt, "submission"],
      ] as const;
      for (const [label, dueAt, kind] of deadlines) {
        if (dueAt < now || dueAt > endsAt) continue;
        for (const recipientId of recipients) {
          rows.push({
            recipientId,
            type: "DEADLINE",
            title: `${team.name} ${label} 마감 임박`,
            body: `${formatKoreanDate(dueAt)}까지입니다. 남은 작업과 제출 상태를 확인해 주세요.`,
            href: `/teams/${team.id}`,
            dedupeKey: `deadline:team:${team.id}:${kind}:${dueAt.toISOString()}:${recipientId}`,
            createdAt: now,
          });
        }
      }
    }
    for (const milestone of milestones) {
      const recipients = new Set([milestone.team.professorId, ...milestone.team.members.map(({ studentId }) => studentId)]);
      for (const recipientId of recipients) {
        rows.push({
          recipientId,
          type: "DEADLINE",
          title: `마일스톤 마감 임박 · ${milestone.title}`,
          body: `${milestone.team.name}의 마일스톤이 ${formatKoreanDate(milestone.dueAt)}에 마감됩니다.`,
          href: `/teams/${milestone.team.id}`,
          dedupeKey: `deadline:milestone:${milestone.id}:${milestone.dueAt.toISOString()}:${recipientId}`,
          createdAt: now,
        });
      }
    }
    for (const report of reports) {
      if (report.versions[0]?.decision?.decision === "APPROVED") continue;
      const recipients = new Set([report.team.professorId, ...report.team.members.map(({ studentId }) => studentId)]);
      const label = report.type === "START" ? "착수 보고서" : report.type === "MIDTERM" ? "중간 보고서" : "결과 보고서";
      for (const recipientId of recipients) {
        rows.push({
          recipientId,
          type: "DEADLINE",
          title: `${report.team.name} ${label} 마감 임박`,
          body: `${formatKoreanDate(report.dueAt)}까지입니다. 최신 제출·검토 상태를 확인해 주세요.`,
          href: `/teams/${report.team.id}`,
          dedupeKey: `deadline:report:${report.id}:${report.dueAt.toISOString()}:${recipientId}`,
          createdAt: now,
        });
      }
    }
    if (!rows.length) return 0;
    return this.client.notification.createMany({ data: rows, skipDuplicates: true }).then(({ count }) => count);
  }
}

function formatKoreanDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(date);
}
