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

export function teamSupervisorWhere(actor: CurrentActor): Prisma.ProjectTeamWhereInput {
  if (actor.role === "ADMIN") return {};
  return {
    OR: [
      ...(actor.role === "PROFESSOR" ? [{ project: { managerId: actor.id } }] : []),
      { project: { assistants: { some: { userId: actor.id } } } },
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
  return Prisma.sql`EXISTS (
    SELECT 1
    FROM "topic"
    LEFT JOIN "project_assistant"
      ON "project_assistant"."topicId" = "topic"."id"
      AND "project_assistant"."userId" = ${actor.id}
    WHERE "topic"."id" = "project_team"."projectId"
      AND (
        ${actor.role === "PROFESSOR" ? Prisma.sql`"topic"."managerId" = ${actor.id} OR` : Prisma.empty}
        "project_assistant"."id" IS NOT NULL
      )
  )`;
}
