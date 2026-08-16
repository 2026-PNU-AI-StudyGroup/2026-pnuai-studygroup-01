import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createDiscussionNotifications } from "@/modules/notification/infrastructure/notification-events";
import type { DiscussionPostWriter } from "@/modules/team/application/team-workspace-ports";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";
import { teamActorSql } from "@/modules/team/infrastructure/prisma-team-workspace-authorization";

export class PrismaTeamDiscussionRepository
  implements DiscussionPostWriter
{
  constructor(private readonly client: PrismaClient) {}

  createDiscussionPost(input: {
    teamId: string;
    actor: CurrentActor;
    content: string;
  }): Promise<{ id: string } | null> {
    const id = randomUUID();
    const createdAt = new Date();
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        INSERT INTO "discussion_post" ("id", "projectTeamId", "authorId", "content", "createdAt")
        SELECT ${id}, "project_team"."id", ${input.actor.id}, ${input.content}, ${createdAt}
        FROM "project_team"
        WHERE "project_team"."id" = ${input.teamId}
          AND EXISTS (
            SELECT 1 FROM "topic"
            JOIN "project_program" ON "project_program"."id" = "topic"."programId"
            WHERE "topic"."id" = "project_team"."projectId"
              AND "topic"."status" = 'ACTIVE'
              AND "project_program"."endsAt" > ${createdAt}
          )
          AND ${teamActorSql(input.actor)}
        RETURNING "id"
      `);
      if (!rows[0]) return null;
      await enqueueTranslations(transaction, [input.content]);

      const team = await transaction.projectTeam.findUniqueOrThrow({
        where: { id: input.teamId },
        select: { project: { select: { id: true, managerId: true } } },
      });
      const [members, assistants, author] = await Promise.all([
        transaction.projectTeamMembership.findMany({
          where: { projectTeamId: input.teamId, endedAt: null },
          select: { userId: true },
        }),
        transaction.projectAssistant.findMany({
          where: { topicId: team.project.id },
          select: { userId: true },
        }),
        transaction.user.findUniqueOrThrow({
          where: { id: input.actor.id },
          select: { name: true },
        }),
      ]);
      const recipientIds = [...new Set([
        ...(team.project.managerId ? [team.project.managerId] : []),
        ...members.map(({ userId }) => userId),
        ...assistants.map(({ userId }) => userId),
      ])].filter((userId) => userId !== input.actor.id);
      const messagePreview = input.content.replace(/\s+/g, " ").slice(0, 160);
      await createDiscussionNotifications(
        transaction,
        recipientIds.map((recipientId) => ({
          recipientId,
          title: "새 팀 대화 메시지가 도착했습니다",
          body: `${author.name} · ${messagePreview}`,
          titleEn: "New team discussion message",
          bodyEn: `${author.name} · ${messagePreview}`,
          href: `/projects/${team.project.id}/discussion`,
          dedupeKey: `discussion:${id}:${recipientId}`,
          createdAt,
        })),
      );

      return rows[0];
    });
  }
}
