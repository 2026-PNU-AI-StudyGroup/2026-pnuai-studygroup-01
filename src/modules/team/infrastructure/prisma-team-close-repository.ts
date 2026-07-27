import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type { TeamCloser } from "@/modules/team/application/archive-projects";
import { teamSupervisorSql } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

export class PrismaTeamCloseRepository implements TeamCloser {
  constructor(private readonly client: PrismaClient) {}

  close(teamId: string, actor: CurrentActor): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const decidedAt = new Date();
      const initial = await transaction.team.findUnique({
        where: { id: teamId },
        select: { topicId: true },
      });
      if (!initial) return false;
      await transaction.$queryRaw(Prisma.sql`
        SELECT "project_program"."id"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${initial.topicId}
        FOR UPDATE OF "project_program"
      `);
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "topic" WHERE "id" = ${initial.topicId} FOR UPDATE`,
      );
      const teams = await transaction.$queryRaw<Array<{
        id: string;
        topicId: string;
      }>>(Prisma.sql`
        SELECT "team"."id", "team"."topicId"
        FROM "team"
        WHERE "team"."id" = ${teamId}
          AND "team"."status" = 'CONFIRMED'
          AND ${teamSupervisorSql(actor)}
        FOR UPDATE
      `);
      const team = teams[0];
      if (!team) return false;

      const approved = await transaction.$queryRaw<Array<{
        approved: boolean;
      }>>(Prisma.sql`
        SELECT true AS "approved"
        WHERE EXISTS (
          SELECT 1 FROM "report" WHERE "teamId" = ${teamId}
        )
          AND NOT EXISTS (
            SELECT 1
            FROM "report"
            WHERE "report"."teamId" = ${teamId}
              AND NOT EXISTS (
                SELECT 1
                FROM "report_version"
                JOIN "approval_decision" ON "approval_decision"."reportVersionId" = "report_version"."id"
                WHERE "report_version"."reportId" = "report"."id"
                  AND "report_version"."version" = (
                    SELECT max("latest"."version")
                    FROM "report_version" AS "latest"
                    WHERE "latest"."reportId" = "report"."id"
                  )
                  AND "approval_decision"."decision" = 'APPROVED'
              )
          )
      `);
      if (approved.length !== 1) return false;
      const result = await transaction.team.updateMany({
        where: { id: teamId, status: "CONFIRMED" },
        data: { status: "CLOSED" },
      });
      if (result.count !== 1) return false;

      const applications = await transaction.topicApplication.findMany({
        where: { topicId: team.topicId, status: "PENDING" },
        select: {
          id: true,
          studentId: true,
          topic: { select: { title: true } },
        },
      });
      await transaction.topic.updateMany({
        where: { id: team.topicId },
        data: { status: "CLOSED" },
      });
      await transaction.topicApplication.updateMany({
        where: { topicId: team.topicId, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
      await createApplicationResultNotifications(
        transaction,
        applications.map((application) => ({
          applicationId: application.id,
          recipientId: application.studentId,
          topicTitle: application.topic.title,
          outcome: "REJECTED",
          createdAt: decidedAt,
        })),
      );
      await transaction.auditLog.create({ data: {
        actorId: actor.id,
        action: "TEAM_CLOSED",
        targetType: "TEAM",
        targetId: team.id,
        metadata: { topicId: team.topicId },
        createdAt: decidedAt,
      } });
      return true;
    });
  }
}
