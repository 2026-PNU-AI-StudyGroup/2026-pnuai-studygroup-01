import { Prisma } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export function teamActorSql(actor: CurrentActor): Prisma.Sql {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  if (actor.role === "PROFESSOR") {
    return Prisma.sql`"team"."professorId" = ${actor.id}`;
  }
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "team_member"
    WHERE "team_member"."teamId" = "team"."id"
      AND "team_member"."studentId" = ${actor.id}
  )`;
}

export function teamRecordActorSql(actor: CurrentActor): Prisma.Sql {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  if (actor.role === "PROFESSOR") return Prisma.sql`FALSE`;
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "team_member"
    WHERE "team_member"."teamId" = "team"."id"
      AND "team_member"."studentId" = ${actor.id}
  )`;
}

export function validTeamAssigneesSql(assigneeIds: string[]): Prisma.Sql {
  if (assigneeIds.length === 0) return Prisma.sql`TRUE`;
  return Prisma.sql`(
    SELECT COUNT(DISTINCT "team_member"."studentId")
    FROM "team_member"
    WHERE "team_member"."teamId" = "team"."id"
      AND "team_member"."studentId" IN (${Prisma.join(assigneeIds)})
  ) = ${assigneeIds.length}`;
}
