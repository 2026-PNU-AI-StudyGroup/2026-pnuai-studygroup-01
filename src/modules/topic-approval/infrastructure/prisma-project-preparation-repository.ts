import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ProjectPreparationRepository, ProjectPreparationUpdateOutcome } from "@/modules/topic-approval/application/manage-project-preparation";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaProjectPreparationRepository implements ProjectPreparationRepository {
  constructor(private readonly client: PrismaClient) {}

  updatePreparation(input: {
    actor: { id: string };
    projectId: string;
    projectTeamName: string;
    projectRepresentativeId: string;
    title: string;
    description: string;
    updatedAt: Date;
  }): Promise<ProjectPreparationUpdateOutcome> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ teamId: string; topicId: string; authorId: string }>>(Prisma.sql`
        SELECT "project_team"."id" AS "teamId", "topic"."id" AS "topicId", "topic"."authorId" AS "authorId"
        FROM "project_team"
        INNER JOIN "topic" ON "topic"."id" = "project_team"."projectId"
        WHERE "topic"."id" = ${input.projectId}
          AND "topic"."status" = 'PENDING_APPROVAL'
          AND "project_team"."confirmedAt" IS NULL
        FOR UPDATE OF "project_team", "topic"
      `);
      const project = rows[0];
      if (!project) return "NOT_FOUND";
      if (project.authorId !== input.actor.id) return "FORBIDDEN";

      const memberships = await transaction.projectTeamMembership.findMany({
        where: { projectTeamId: project.teamId, endedAt: null },
        select: { id: true, userId: true, user: { select: { role: true, accountStatus: true } } },
      });
      const representative = memberships.find(({ userId }) => userId === input.projectRepresentativeId);
      if (!representative || representative.user.role !== "STUDENT" || representative.user.accountStatus !== "ACTIVE") {
        return "UNAVAILABLE";
      }

      await transaction.projectTeamMembership.updateMany({
        where: { projectTeamId: project.teamId, endedAt: null, role: "LEADER" },
        data: { role: "MEMBER" },
      });
      await transaction.projectTeamMembership.update({
        where: { id: representative.id },
        data: { role: "LEADER" },
      });
      await transaction.projectTeam.update({
        where: { id: project.teamId },
        data: { name: input.projectTeamName, updatedAt: input.updatedAt },
      });
      await transaction.topic.update({
        where: { id: project.topicId },
        data: { title: input.title, description: input.description, updatedAt: input.updatedAt },
      });
      await enqueueTranslations(transaction, [input.projectTeamName, input.title, input.description]);
      return "UPDATED";
    });
  }
}
