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
          "id", "teamId", "createdById", "title", "dueAt",
          "status", "createdAt", "updatedAt"
        )
        SELECT ${id}, "team"."id", ${input.actor.id}, ${input.title},
          ${input.dueAt}, 'TODO'::"TaskStatus", ${now}, ${now}
        FROM "team"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" <> 'CLOSED'
          AND ${teamRecordActorSql(input.actor)}
          AND ${validTeamAssigneesSql(assigneeIds)}
        RETURNING "id"
      `);
      if (!rows[0]) return null;
      await enqueueTranslations(transaction, [input.title]);
      if (assigneeIds.length > 0) {
        await transaction.taskAssignee.createMany({
          data: assigneeIds.map((userId) => ({ taskId: id, userId })),
        });
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
      const rows = await transaction.$queryRaw<Array<{
        teamId: string;
      }>>(Prisma.sql`
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
        FROM "team"
        WHERE "task"."id" = ${input.id}
          AND "team"."id" = "task"."teamId"
          AND "team"."status" <> 'CLOSED'
          AND ${teamRecordActorSql(input.actor)}
          AND ${validTeamAssigneesSql(uniqueAssigneeIds)}
        RETURNING "task"."teamId"
      `);
      const task = rows[0];
      if (!task) return null;
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
      FROM "team"
      WHERE "task"."id" = ${id}
        AND "task"."status" <> 'DONE'::"TaskStatus"
        AND "team"."id" = "task"."teamId"
        AND "team"."status" <> 'CLOSED'
        AND ${teamRecordActorSql(actor)}
      RETURNING "task"."teamId"
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
      FROM "team"
      WHERE "task"."id" = ${id}
        AND "task"."status" = 'DONE'::"TaskStatus"
        AND "team"."id" = "task"."teamId"
        AND "team"."status" <> 'CLOSED'
        AND ${teamRecordActorSql(actor)}
      RETURNING "task"."teamId"
    `);
    return rows[0] ?? null;
  }

  async deleteTask(id: string, actor: CurrentActor): Promise<{ teamId: string } | null> {
    const rows = await this.client.$queryRaw<Array<{ teamId: string }>>(Prisma.sql`
      DELETE FROM "task"
      USING "team"
      WHERE "task"."id" = ${id}
        AND "team"."id" = "task"."teamId"
        AND "team"."status" <> 'CLOSED'
        AND ${teamRecordActorSql(actor)}
      RETURNING "task"."teamId"
    `);
    return rows[0] ?? null;
  }
}
