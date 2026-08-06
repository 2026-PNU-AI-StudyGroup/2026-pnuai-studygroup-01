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
        INSERT INTO "discussion_post" ("id", "teamId", "authorId", "content", "createdAt")
        SELECT ${id}, "team"."id", ${input.actor.id}, ${input.content}, ${createdAt}
        FROM "team"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" <> 'CLOSED'
          AND ${teamActorSql(input.actor)}
        RETURNING "id"
      `);
      if (!rows[0]) return null;
      await enqueueTranslations(transaction, [input.content]);

      const team = await transaction.team.findUniqueOrThrow({
        where: { id: input.teamId },
        select: { name: true, professorId: true, topicId: true },
      });
      const [members, assistants, author] = await Promise.all([
        transaction.teamMember.findMany({
          where: { teamId: input.teamId },
          select: { studentId: true },
        }),
        transaction.projectAssistant.findMany({
          where: { topicId: team.topicId },
          select: { userId: true },
        }),
        transaction.user.findUniqueOrThrow({
          where: { id: input.actor.id },
          select: { name: true },
        }),
      ]);
      const recipientIds = [...new Set([
        team.professorId,
        ...members.map(({ studentId }) => studentId),
        ...assistants.map(({ userId }) => userId),
      ])].filter((userId) => userId !== input.actor.id);
      await createDiscussionNotifications(
        transaction,
        recipientIds.map((recipientId) => ({
          recipientId,
          title: "새 팀 대화 메시지가 도착했습니다",
          body: `${author.name}님이 ${team.name} 팀 대화에 메시지를 보냈습니다.`,
          href: `/teams/${input.teamId}/discussion`,
          dedupeKey: `discussion:${id}:${recipientId}`,
          createdAt,
        })),
      );

      return rows[0];
    });
  }
}
