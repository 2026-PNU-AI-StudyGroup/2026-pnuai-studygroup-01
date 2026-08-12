import type { PrismaClient } from "@/generated/prisma/client";
import type { DeadlineNotificationGenerator } from "@/modules/notification/application/notification-ports";

type NotificationCreateInput = {
  recipientId: string;
  type: "DEADLINE";
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
  createdAt: Date;
};

export class PrismaDeadlineNotificationGenerator
  implements DeadlineNotificationGenerator
{
  constructor(private readonly client: PrismaClient) {}

  async generate(now: Date, endsAt: Date): Promise<number> {
    const [teams, tasks, reports] = await Promise.all([
      this.client.team.findMany({
        where: {
          status: { not: "CLOSED" },
          OR: [
            { topic: { program: { executionEndsAt: { gte: now, lte: endsAt } } } },
            { topic: { program: { submissionEndsAt: { gte: now, lte: endsAt } } } },
          ],
        },
        select: {
          id: true,
          name: true,
          professorId: true,
          members: { select: { studentId: true } },
          topic: {
            select: {
              program: { select: { executionEndsAt: true, submissionEndsAt: true } },
              assistants: { select: { userId: true } },
            },
          },
        },
      }),
      this.client.task.findMany({
        where: {
          status: { not: "DONE" },
          dueAt: { gte: now, lte: endsAt },
          team: { status: { not: "CLOSED" } },
        },
        select: {
          id: true,
          title: true,
          dueAt: true,
          team: {
            select: {
              id: true,
              name: true,
              professorId: true,
              members: { select: { studentId: true } },
              topic: {
                select: { assistants: { select: { userId: true } } },
              },
            },
          },
        },
      }),
      this.client.report.findMany({
        where: {
          required: true,
          dueAt: { gte: now, lte: endsAt },
          team: { status: "CONFIRMED" },
        },
        select: {
          id: true,
          titleSnapshot: true,
          dueAt: true,
          versions: {
            orderBy: { version: "desc" },
            take: 1,
            select: { decision: { select: { decision: true } } },
          },
          team: {
            select: {
              id: true,
              name: true,
              professorId: true,
              members: { select: { studentId: true } },
              topic: {
                select: { assistants: { select: { userId: true } } },
              },
            },
          },
        },
      }),
    ]);

    const rows: NotificationCreateInput[] = [];
    for (const team of teams) {
      const recipients = new Set([
        team.professorId,
        ...team.topic.assistants.map(({ userId }) => userId),
        ...team.members.map(({ studentId }) => studentId),
      ]);
      const deadlines = [
        ["수행 종료", team.topic.program.executionEndsAt, "execution"],
        ["결과물 제출", team.topic.program.submissionEndsAt, "submission"],
      ] as const;
      for (const [label, dueAt, kind] of deadlines) {
        if (dueAt < now || dueAt > endsAt) continue;
        for (const recipientId of recipients) {
          rows.push({
            recipientId,
            type: "DEADLINE",
            title: `${team.name} ${label} 마감 임박`,
            body: `${formatKoreanDate(dueAt)}까지입니다. 남은 작업과 제출 상태를 확인해 주세요.`,
            href: kind === "execution"
              ? `/teams/${team.id}`
              : `/teams/${team.id}/artifacts`,
            dedupeKey:
              `deadline:team:${team.id}:${kind}:${dueAt.toISOString()}:${recipientId}`,
            createdAt: now,
          });
        }
      }
    }
    for (const task of tasks) {
      const recipients = new Set([
        task.team.professorId,
        ...task.team.topic.assistants.map(({ userId }) => userId),
        ...task.team.members.map(({ studentId }) => studentId),
      ]);
      for (const recipientId of recipients) {
        rows.push({
          recipientId,
          type: "DEADLINE",
          title: `할 일 마감 임박 · ${task.title}`,
          body:
            `${task.team.name}의 할 일이 ${formatKoreanDate(task.dueAt)}에 마감됩니다.`,
          href: `/teams/${task.team.id}/tasks`,
          dedupeKey:
            `deadline:task:${task.id}:${task.dueAt.toISOString()}:${recipientId}`,
          createdAt: now,
        });
      }
    }
    for (const report of reports) {
      if (report.versions[0]?.decision?.decision === "APPROVED") continue;
      const recipients = new Set([
        report.team.professorId,
        ...report.team.topic.assistants.map(({ userId }) => userId),
        ...report.team.members.map(({ studentId }) => studentId),
      ]);
      const label = report.titleSnapshot;
      for (const recipientId of recipients) {
        rows.push({
          recipientId,
          type: "DEADLINE",
          title: `${report.team.name} ${label} 마감 임박`,
          body:
            `${formatKoreanDate(report.dueAt)}까지입니다. 최신 제출·검토 상태를 확인해 주세요.`,
          href: `/teams/${report.team.id}/reports`,
          dedupeKey:
            `deadline:report:${report.id}:${report.dueAt.toISOString()}:${recipientId}`,
          createdAt: now,
        });
      }
    }
    if (!rows.length) return 0;
    return this.client.notification.createMany({
      data: rows,
      skipDuplicates: true,
    }).then(({ count }) => count);
  }
}

function formatKoreanDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
