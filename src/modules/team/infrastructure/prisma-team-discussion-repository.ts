import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { DiscussionPostWriter } from "@/modules/team/application/team-workspace-ports";
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
    return this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO "discussion_post" ("id", "teamId", "authorId", "content", "createdAt")
      SELECT ${id}, "team"."id", ${input.actor.id}, ${input.content}, ${new Date()}
      FROM "team"
      WHERE "team"."id" = ${input.teamId}
        AND "team"."status" <> 'CLOSED'
        AND ${teamActorSql(input.actor)}
      RETURNING "id"
    `).then((rows) => rows[0] ?? null);
  }
}
