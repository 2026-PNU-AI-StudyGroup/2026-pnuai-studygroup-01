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

  updateTaskStatus(
    id: string,
    status: TaskStatus,
    assigneeIds: string[],
    actor: CurrentActor,
  ): Promise<{ teamId: string } | null> {
    const uniqueAssigneeIds = [...new Set(assigneeIds)];
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{
        teamId: string;
      }>>(Prisma.sql`
        UPDATE "task"
        SET "status" = ${status}::"TaskStatus",
          "updatedAt" = ${new Date()}
        FROM "team"
        WHERE "task"."id" = ${id}
          AND "team"."id" = "task"."teamId"
          AND "team"."status" <> 'CLOSED'
          AND ${teamRecordActorSql(actor)}
          AND ${validTeamAssigneesSql(uniqueAssigneeIds)}
        RETURNING "task"."teamId"
      `);
      const task = rows[0];
      if (!task) return null;
      await transaction.taskAssignee.deleteMany({
        where: { taskId: id },
      });
      if (uniqueAssigneeIds.length > 0) {
        await transaction.taskAssignee.createMany({
          data: uniqueAssigneeIds.map((userId) => ({
            taskId: id,
            userId,
          })),
        });
      }
      return task;
    });
  }

  updateTaskDetails(input: {
    id: string;
    title: string;
    dueAt: Date;
    actor: CurrentActor;
  }): Promise<{ teamId: string } | null> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ teamId: string }>>(Prisma.sql`
        UPDATE "task"
        SET "title" = ${input.title},
          "dueAt" = ${input.dueAt},
          "updatedAt" = ${new Date()}
        FROM "team"
        WHERE "task"."id" = ${input.id}
          AND "team"."id" = "task"."teamId"
          AND "team"."status" <> 'CLOSED'
          AND ${teamRecordActorSql(input.actor)}
        RETURNING "task"."teamId"
      `);
      if (!rows[0]) return null;
      await enqueueTranslations(transaction, [input.title]);
      return rows[0];
    });
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
