import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  MilestoneStatus,
  MilestoneWriter,
} from "@/modules/team/application/team-workspace-ports";
import {
  teamRecordActorSql,
  validTeamAssigneesSql,
} from "@/modules/team/infrastructure/prisma-team-workspace-authorization";

export class PrismaTeamMilestoneRepository implements MilestoneWriter {
  constructor(private readonly client: PrismaClient) {}

  createMilestone(input: {
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
        INSERT INTO "milestone" (
          "id", "teamId", "createdById", "title", "dueAt",
          "status", "createdAt", "updatedAt"
        )
        SELECT ${id}, "team"."id", ${input.actor.id}, ${input.title},
          ${input.dueAt}, 'TODO'::"MilestoneStatus", ${now}, ${now}
        FROM "team"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" <> 'CLOSED'
          AND ${teamRecordActorSql(input.actor)}
          AND ${validTeamAssigneesSql(assigneeIds)}
        RETURNING "id"
      `);
      if (!rows[0]) return null;
      if (assigneeIds.length > 0) {
        await transaction.milestoneAssignee.createMany({
          data: assigneeIds.map((userId) => ({ milestoneId: id, userId })),
        });
      }
      return rows[0];
    });
  }

  updateMilestoneStatus(
    id: string,
    status: MilestoneStatus,
    assigneeIds: string[],
    actor: CurrentActor,
  ): Promise<{ teamId: string } | null> {
    const uniqueAssigneeIds = [...new Set(assigneeIds)];
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{
        teamId: string;
      }>>(Prisma.sql`
        UPDATE "milestone"
        SET "status" = ${status}::"MilestoneStatus",
          "updatedAt" = ${new Date()}
        FROM "team"
        WHERE "milestone"."id" = ${id}
          AND "team"."id" = "milestone"."teamId"
          AND "team"."status" <> 'CLOSED'
          AND ${teamRecordActorSql(actor)}
          AND ${validTeamAssigneesSql(uniqueAssigneeIds)}
        RETURNING "milestone"."teamId"
      `);
      const milestone = rows[0];
      if (!milestone) return null;
      await transaction.milestoneAssignee.deleteMany({
        where: { milestoneId: id },
      });
      if (uniqueAssigneeIds.length > 0) {
        await transaction.milestoneAssignee.createMany({
          data: uniqueAssigneeIds.map((userId) => ({
            milestoneId: id,
            userId,
          })),
        });
      }
      return milestone;
    });
  }
}
