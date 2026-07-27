import { Prisma } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export function topicSupervisorWhere(actor: CurrentActor): Prisma.TopicWhereInput {
  if (actor.role === "ADMIN") return {};
  return {
    OR: [
      ...(actor.role === "PROFESSOR" ? [{ managerId: actor.id }] : []),
      { assistants: { some: { userId: actor.id } } },
    ],
  };
}

export function teamSupervisorWhere(actor: CurrentActor): Prisma.TeamWhereInput {
  if (actor.role === "ADMIN") return {};
  return {
    OR: [
      ...(actor.role === "PROFESSOR" ? [{ professorId: actor.id }] : []),
      { topic: { assistants: { some: { userId: actor.id } } } },
    ],
  };
}

export function topicSupervisorSql(actor: CurrentActor): Prisma.Sql {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  const manager = actor.role === "PROFESSOR"
    ? Prisma.sql`"topic"."managerId" = ${actor.id} OR`
    : Prisma.empty;
  return Prisma.sql`(
    ${manager} EXISTS (
      SELECT 1
      FROM "project_assistant"
      WHERE "project_assistant"."topicId" = "topic"."id"
        AND "project_assistant"."userId" = ${actor.id}
    )
  )`;
}

export function teamSupervisorSql(actor: CurrentActor): Prisma.Sql {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  const manager = actor.role === "PROFESSOR"
    ? Prisma.sql`"team"."professorId" = ${actor.id} OR`
    : Prisma.empty;
  return Prisma.sql`(
    ${manager} EXISTS (
      SELECT 1
      FROM "project_assistant"
      WHERE "project_assistant"."topicId" = "team"."topicId"
        AND "project_assistant"."userId" = ${actor.id}
    )
  )`;
}
