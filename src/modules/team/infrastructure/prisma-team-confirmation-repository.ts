import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type { TeamConfirmationWriter } from "@/modules/team/application/confirm-team";

export class PrismaTeamConfirmationRepository
  implements TeamConfirmationWriter
{
  constructor(private readonly client: PrismaClient) {}

  confirm(teamId: string, actor: CurrentActor): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const decidedAt = new Date();
      const rows = await transaction.$queryRaw<Array<{
        id: string;
        topicId: string;
      }>>(Prisma.sql`
        UPDATE "team" SET "status" = 'CONFIRMED', "updatedAt" = ${decidedAt}
        WHERE "id" = ${teamId} AND "status" = 'FORMING'
          AND EXISTS (SELECT 1 FROM "team_member" WHERE "teamId" = "team"."id")
          AND (${actor.role}::"UserRole" = 'ADMIN' OR (${actor.role}::"UserRole" = 'PROFESSOR' AND "professorId" = ${actor.id}))
        RETURNING "id", "topicId"
      `);
      const team = rows[0];
      if (!team) return false;

      await transaction.teamApplicationDraft.deleteMany({
        where: { topicId: team.topicId },
      });
      const applications = await transaction.topicApplication.findMany({
        where: { topicId: team.topicId, status: "PENDING" },
        select: {
          id: true,
          studentId: true,
          topic: { select: { title: true } },
        },
      });
      await transaction.recruitmentPost.updateMany({
        where: { teamId, status: "OPEN" },
        data: { status: "CLOSED" },
      });
      await transaction.topicApplication.updateMany({
        where: { topicId: team.topicId, status: "PENDING" },
        data: { status: "REJECTED", decidedAt },
      });
      await transaction.recruitmentApplication.updateMany({
        where: { post: { teamId }, status: "PENDING" },
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
          action: "TEAM_CONFIRMED",
          targetType: "TEAM",
          targetId: team.id,
          metadata: { topicId: team.topicId },
          createdAt: decidedAt,
        },
      });
      return true;
    });
  }
}
