import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  TaskStatus,
  TaskWriter,
} from "@/modules/team/application/team-workspace-ports";
import {
  teamRecordActorSql,
  validTeamAssigneesSql,
} from "@/modules/team/infrastructure/prisma-team-workspace-authorization";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";

export class PrismaTeamTaskRepository implements TaskWriter {
  constructor(private readonly client: PrismaClient) {}

  createTask(input: {
    teamId: string;
    actor: CurrentActor;
    title: string;
    dueAt: Date;
    assigneeIds: string[];
  }): Promise<{ id: string } | null> {
    const id = randomUUID();
    const now = new Date();
    const assigneeIds = [...new Set(input.assigneeIds)];
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        INSERT INTO "task" (
          "id", "projectTeamId", "createdById", "title", "dueAt",
          "status", "createdAt", "updatedAt"
        )
        SELECT ${id}, "project_team"."id", ${input.actor.id}, ${input.title},
          ${input.dueAt}, 'TODO'::"TaskStatus", ${now}, ${now}
        FROM "project_team"
        WHERE "project_team"."id" = ${input.teamId}
          AND ${activeProjectTeamSql(now)}
          AND ${teamRecordActorSql(input.actor)}
          AND ${validTeamAssigneesSql(assigneeIds)}
        RETURNING "task"."id"
      `);
      if (!rows[0]) return null;
      const projectTeam = await transaction.projectTeam.findUnique({
        where: { id: input.teamId },
        select: { projectId: true },
      });
      if (!projectTeam) return null;
      await enqueueTranslations(transaction, [input.title]);
      if (assigneeIds.length > 0) {
        await transaction.taskAssignee.createMany({
          data: assigneeIds.map((userId) => ({ taskId: id, userId })),
        });
        const recipientIds = assigneeIds.filter((userId) => userId !== input.actor.id);
        if (recipientIds.length) {
          const href = `/projects/${projectTeam.projectId}/tasks`;
          await transaction.notification.createMany({
            data: recipientIds.map((recipientId) => ({
              recipientId,
              type: "SYSTEM" as const,
              title: "새 할 일이 배정되었습니다",
              body: `${input.title} 할 일을 확인해 주세요.`,
              href,
              dedupeKey: `task-assignment:${id}:${recipientId}`,
              createdAt: now,
            })),
            skipDuplicates: true,
          });
          await enqueueEmailEvents(transaction, recipientIds.map((recipientId) => ({
            kind: "TASK_ASSIGNMENT" as const,
            recipientId,
            title: "새 할 일이 배정되었습니다",
            body: `${input.title} 할 일을 ${formatKoreanDate(input.dueAt)}까지 확인해 주세요.`,
            titleEn: "New task assigned",
            bodyEn: `You were assigned ${input.title}. Review it by ${formatEnglishDate(input.dueAt)}.`,
            href,
            idempotencyKey: `email:task-assignment:${id}:${recipientId}`,
            createdAt: now,
          })));
        }
      }
      return rows[0];
    });
  }

  updateTask(input: {
    id: string;
    title: string;
    dueAt: Date;
    status: TaskStatus;
    assigneeIds: string[];
    actor: CurrentActor;
  }): Promise<{ teamId: string } | null> {
    const uniqueAssigneeIds = [...new Set(input.assigneeIds)];
    const now = new Date();
    return this.client.$transaction(async (transaction) => {
      const previous = await transaction.task.findUnique({
        where: { id: input.id },
        select: { dueAt: true, projectTeam: { select: { projectId: true } }, assignees: { select: { userId: true } } },
      });
      const rows = await transaction.$queryRaw<Array<{ teamId: string }>>(Prisma.sql`
        UPDATE "task"
        SET "title" = ${input.title},
          "dueAt" = ${input.dueAt},
          "status" = ${input.status}::"TaskStatus",
          "completedAt" = CASE
            WHEN ${input.status}::"TaskStatus" = 'DONE'::"TaskStatus"
              THEN COALESCE("task"."completedAt", ${now})
            ELSE NULL
          END,
          "updatedAt" = ${now}
        FROM "project_team"
        WHERE "task"."id" = ${input.id}
          AND "project_team"."id" = "task"."projectTeamId"
          AND ${activeProjectTeamSql(now)}
          AND ${teamRecordActorSql(input.actor)}
          AND ${validTeamAssigneesSql(uniqueAssigneeIds)}
        RETURNING "task"."projectTeamId" AS "teamId"
      `);
      const task = rows[0];
      if (!task) return null;
      const projectId = previous?.projectTeam.projectId;
      if (!projectId) return null;
      await enqueueTranslations(transaction, [input.title]);
      await transaction.taskAssignee.deleteMany({
        where: { taskId: input.id },
      });
      if (uniqueAssigneeIds.length > 0) {
        await transaction.taskAssignee.createMany({
          data: uniqueAssigneeIds.map((userId) => ({
            taskId: input.id,
            userId,
          })),
        });
      }
      const previousAssigneeIds = new Set(previous?.assignees.map(({ userId }) => userId) ?? []);
      const recipients = new Set<string>();
      for (const userId of uniqueAssigneeIds) {
        if (!previousAssigneeIds.has(userId) || previous?.dueAt.getTime() !== input.dueAt.getTime()) {
          if (userId !== input.actor.id) recipients.add(userId);
        }
      }
      if (recipients.size) {
        const href = `/projects/${projectId}/tasks`;
        const dueChanged = previous?.dueAt.getTime() !== input.dueAt.getTime();
        const title = dueChanged ? "할 일 마감이 변경되었습니다" : "할 일이 배정되었습니다";
        const body = dueChanged
          ? `${input.title} 할 일의 마감이 ${formatKoreanDate(input.dueAt)}로 변경되었습니다.`
          : `${input.title} 할 일이 배정되었습니다.`;
        const titleEn = dueChanged ? "Task deadline changed" : "Task assigned";
        const bodyEn = dueChanged
          ? `The deadline for ${input.title} is now ${formatEnglishDate(input.dueAt)}.`
          : `You were assigned ${input.title}.`;
        await transaction.notification.createMany({
          data: [...recipients].map((recipientId) => ({
            recipientId,
            type: "SYSTEM" as const,
            title,
            body,
            href,
            dedupeKey: `task-update:${input.id}:${input.dueAt.toISOString()}:${recipientId}`,
            createdAt: now,
          })),
          skipDuplicates: true,
        });
        await enqueueEmailEvents(transaction, [...recipients].map((recipientId) => ({
          kind: "TASK_ASSIGNMENT" as const,
          recipientId,
          title,
          body,
          titleEn,
          bodyEn,
          href,
          idempotencyKey: `email:task-update:${input.id}:${input.dueAt.toISOString()}:${recipientId}`,
          createdAt: now,
        })));
      }
      return task;
    });
  }

  async completeTask(id: string, actor: CurrentActor): Promise<{ teamId: string } | null> {
    const now = new Date();
    const rows = await this.client.$queryRaw<Array<{ teamId: string }>>(Prisma.sql`
      UPDATE "task"
      SET "status" = 'DONE'::"TaskStatus",
        "completedAt" = ${now},
        "updatedAt" = ${now}
      FROM "project_team"
      WHERE "task"."id" = ${id}
        AND "task"."status" <> 'DONE'::"TaskStatus"
        AND "project_team"."id" = "task"."projectTeamId"
        AND ${activeProjectTeamSql(now)}
        AND ${teamRecordActorSql(actor)}
      RETURNING "task"."projectTeamId" AS "teamId"
    `);
    return rows[0] ?? null;
  }

  async reopenTask(id: string, actor: CurrentActor): Promise<{ teamId: string } | null> {
    const now = new Date();
    const rows = await this.client.$queryRaw<Array<{ teamId: string }>>(Prisma.sql`
      UPDATE "task"
      SET "status" = 'TODO'::"TaskStatus",
        "completedAt" = NULL,
        "updatedAt" = ${now}
      FROM "project_team"
      WHERE "task"."id" = ${id}
        AND "task"."status" = 'DONE'::"TaskStatus"
        AND "project_team"."id" = "task"."projectTeamId"
        AND ${activeProjectTeamSql(now)}
        AND ${teamRecordActorSql(actor)}
      RETURNING "task"."projectTeamId" AS "teamId"
    `);
    return rows[0] ?? null;
  }

  async deleteTask(id: string, actor: CurrentActor): Promise<{ teamId: string } | null> {
    const now = new Date();
    const rows = await this.client.$queryRaw<Array<{ teamId: string }>>(Prisma.sql`
      DELETE FROM "task"
      USING "project_team"
      WHERE "task"."id" = ${id}
        AND "project_team"."id" = "task"."projectTeamId"
        AND ${activeProjectTeamSql(now)}
        AND ${teamRecordActorSql(actor)}
      RETURNING "task"."projectTeamId" AS "teamId"
    `);
    return rows[0] ?? null;
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

function activeProjectTeamSql(now: Date): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM "topic"
    JOIN "project_program" ON "project_program"."id" = "topic"."programId"
    WHERE "topic"."id" = "project_team"."projectId"
      AND "topic"."status" = 'ACTIVE'
      AND "project_program"."endsAt" > ${now}
  )`;
}
