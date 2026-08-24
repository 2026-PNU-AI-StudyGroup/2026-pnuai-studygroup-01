import type { PrismaClient } from "@/generated/prisma/client";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";
import type { DeadlineNotificationGenerator } from "@/modules/notification/application/notification-ports";

type NotificationCreateInput = {
  recipientId: string;
  type: "DEADLINE";
  title: string;
  body: string;
  titleEn: string;
  bodyEn: string;
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
      this.client.projectTeam.findMany({
        where: {
          project: { status: "ACTIVE", program: { executionEndsAt: { gte: now, lte: endsAt } } },
        },
        select: {
          id: true,
          name: true,
          memberships: { where: { endedAt: null }, select: { userId: true } },
          project: {
            select: {
              id: true,
              managerId: true,
              manager: { select: { role: true } },
              program: { select: { executionEndsAt: true } },
              assistants: { select: { userId: true } },
            },
          },
        },
      }),
      this.client.task.findMany({
        where: {
          status: { not: "DONE" },
          dueAt: { gte: now, lte: endsAt },
          projectTeam: { project: { status: "ACTIVE" } },
        },
        select: {
          id: true,
          title: true,
          dueAt: true,
          projectTeam: {
            select: {
              id: true,
              name: true,
              memberships: { where: { endedAt: null }, select: { userId: true } },
              project: {
                select: { id: true, managerId: true, manager: { select: { role: true } }, assistants: { select: { userId: true } } },
              },
            },
          },
        },
      }),
      this.client.report.findMany({
        where: {
          required: true,
          submissionEnabled: true,
          dueAt: { gte: now, lte: endsAt },
          projectTeam: { confirmedAt: { not: null }, project: { status: "ACTIVE" } },
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
          projectTeam: {
            select: {
              id: true,
              name: true,
              memberships: { where: { endedAt: null }, select: { userId: true } },
              project: {
                select: { id: true, managerId: true, manager: { select: { role: true } }, assistants: { select: { userId: true } } },
              },
            },
          },
        },
      }),
    ]);

    const rows: NotificationCreateInput[] = [];
    for (const team of teams) {
      // 담당자가 지도교수일 때만 알린다. 학생 등록 프로젝트를 관리자 경로로 승인하면 승인한
      // 관리자가 managerId 로 박혀서, 자기가 승인한 모든 팀의 마감 메일을 다 받게 된다.
      // 팀 대화 알림도 같은 이유로 같은 가드를 쓴다.
      const recipients = new Set([
        ...supervisorIds(team.project),
        ...team.project.assistants.map(({ userId }) => userId),
        ...team.memberships.map(({ userId }) => userId),
      ]);
      const deadlines = [
        ["수행·결과물 제출", team.project.program.executionEndsAt, "execution"],
      ] as const;
      for (const [label, dueAt, kind] of deadlines) {
        if (dueAt < now || dueAt > endsAt) continue;
        for (const recipientId of recipients) {
          rows.push({
            recipientId,
            type: "DEADLINE",
            title: `${team.name} ${label} 마감 임박`,
            body: `${formatKoreanDate(dueAt)}까지입니다. 남은 작업과 제출 상태를 확인해 주세요.`,
            titleEn: "Execution deadline approaching",
            bodyEn: `${team.name} has a deadline on ${formatEnglishDate(dueAt)}. Review remaining work and submission status in PMS.`,
            href: `/projects/${team.project.id}`,
            dedupeKey:
              `deadline:team:${team.id}:${kind}:${dueAt.toISOString()}:${recipientId}`,
            createdAt: now,
          });
        }
      }
    }
    for (const task of tasks) {
      const recipients = new Set([
        ...supervisorIds(task.projectTeam.project),
        ...task.projectTeam.project.assistants.map(({ userId }) => userId),
        ...task.projectTeam.memberships.map(({ userId }) => userId),
      ]);
      for (const recipientId of recipients) {
        rows.push({
          recipientId,
          type: "DEADLINE",
          title: `할 일 마감 임박 · ${task.title}`,
          body:
            `${task.projectTeam.name}의 할 일이 ${formatKoreanDate(task.dueAt)}에 마감됩니다.`,
          titleEn: "Task deadline approaching",
          bodyEn: `${task.title} for ${task.projectTeam.name} is due on ${formatEnglishDate(task.dueAt)}.`,
          href: `/projects/${task.projectTeam.project.id}/tasks`,
          dedupeKey:
            `deadline:task:${task.id}:${task.dueAt.toISOString()}:${recipientId}`,
          createdAt: now,
        });
      }
    }
    for (const report of reports) {
      if (report.versions[0]?.decision?.decision === "APPROVED") continue;
      const recipients = new Set([
        ...supervisorIds(report.projectTeam.project),
        ...report.projectTeam.project.assistants.map(({ userId }) => userId),
        ...report.projectTeam.memberships.map(({ userId }) => userId),
      ]);
      const label = report.titleSnapshot;
      for (const recipientId of recipients) {
        rows.push({
          recipientId,
          type: "DEADLINE",
          title: `${report.projectTeam.name} ${label} 마감 임박`,
          body:
            `${formatKoreanDate(report.dueAt)}까지입니다. 최신 제출·검토 상태를 확인해 주세요.`,
          titleEn: "Report deadline approaching",
          bodyEn: `${label} for ${report.projectTeam.name} is due on ${formatEnglishDate(report.dueAt)}. Review the latest submission and review status in PMS.`,
          href: `/projects/${report.projectTeam.project.id}/reports`,
          dedupeKey:
            `deadline:report:${report.id}:${report.dueAt.toISOString()}:${recipientId}`,
          createdAt: now,
        });
      }
    }
    if (!rows.length) return 0;
    return this.client.$transaction(async (transaction) => {
      await enqueueEmailEvents(transaction, rows.map((row) => ({
        kind: "DEADLINE" as const,
        recipientId: row.recipientId,
        title: row.title,
        body: row.body,
        titleEn: row.titleEn,
        bodyEn: row.bodyEn,
        href: row.href,
        idempotencyKey: `email:${row.dedupeKey}`,
        createdAt: row.createdAt,
      })));
      return transaction.notification.createMany({
        data: rows.map((row) => ({
          recipientId: row.recipientId,
          type: row.type,
          title: row.title,
          body: row.body,
          href: row.href,
          dedupeKey: row.dedupeKey,
          createdAt: row.createdAt,
        })),
        skipDuplicates: true,
      }).then(({ count }) => count);
    });
  }
}

function formatKoreanDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatEnglishDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// 담당자를 알림 대상으로 볼지 판단한다. managerId 가 지도교수를 뜻할 때만 참이다.
// 학생 등록 프로젝트를 관리자 경로로 승인하면 승인한 관리자가 managerId 로 박히는데,
// 그 사람까지 담당자로 보면 자기가 승인한 팀 수만큼 마감 메일을 받는다.
function supervisorIds(project: { managerId: string | null; manager?: { role: string } | null }): string[] {
  return project.managerId && project.manager?.role === "PROFESSOR" ? [project.managerId] : [];
}
