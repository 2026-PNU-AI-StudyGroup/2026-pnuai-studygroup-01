import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import { assignProgramDeliverablesToTeam } from "@/modules/report/infrastructure/program-deliverable-assignment";
import type { TeamConfirmationWriter } from "@/modules/team/application/confirm-team";
import { teamSupervisorSql } from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

export class PrismaTeamConfirmationRepository
  implements TeamConfirmationWriter
{
  constructor(private readonly client: PrismaClient) {}

  confirm(teamId: string, actor: CurrentActor): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const decidedAt = new Date();
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "project_program"."id"
        FROM "project_program"
        JOIN "topic" ON "topic"."programId" = "project_program"."id"
        JOIN "project_team" ON "project_team"."projectId" = "topic"."id"
        WHERE "project_team"."id" = ${teamId}
          AND "project_program"."endsAt" > ${decidedAt}
        FOR UPDATE OF "project_program"
      `);
      if (programs.length !== 1) return false;
      const rows = await transaction.$queryRaw<Array<{
        id: string;
        projectId: string;
      }>>(Prisma.sql`
        UPDATE "project_team" SET "confirmedAt" = ${decidedAt}, "updatedAt" = ${decidedAt}
        WHERE "id" = ${teamId} AND "confirmedAt" IS NULL
          AND EXISTS (
            SELECT 1 FROM "project_team_membership"
            WHERE "projectTeamId" = "project_team"."id" AND "endedAt" IS NULL
          )
          AND ${teamSupervisorSql(actor)}
        RETURNING "id", "projectId"
      `);
      const team = rows[0];
      if (!team) return false;
      await assignProgramDeliverablesToTeam(transaction, team.id, decidedAt);

      const applications = await transaction.topicApplication.findMany({
        where: { topicId: team.projectId, status: "PENDING" },
        select: {
          id: true,
          studentId: true,
          topic: { select: { title: true } },
        },
      });
      await transaction.recruitmentPost.updateMany({
        where: { projectTeamId: teamId, status: "OPEN" },
        data: { status: "CLOSED" },
      });
      await transaction.topicApplication.updateMany({
        where: { topicId: team.projectId, status: "PENDING" },
        data: {
          status: "REJECTED",
          decidedAt,
          decidedById: actor.id,
          reviewComment: "프로젝트 팀이 확정되어 모집이 종료되었습니다.",
        },
      });
      await transaction.recruitmentApplication.updateMany({
        where: { post: { projectTeamId: teamId }, status: "PENDING" },
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
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PROJECT_TEAM_CONFIRMED",
          targetType: "PROJECT_TEAM",
          targetId: team.id,
          metadata: { projectId: team.projectId },
          createdAt: decidedAt,
        },
      });
      return true;
    });
  }
}
