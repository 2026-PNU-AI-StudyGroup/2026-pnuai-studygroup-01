import { Prisma } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  teamSupervisorSql,
  teamSupervisorWhere,
} from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

export function teamActorWhere(actor: CurrentActor): Prisma.TeamWhereInput {
  if (actor.role === "ADMIN") return {};
  return {
    OR: [
      teamSupervisorWhere(actor),
      { members: { some: { studentId: actor.id } } },
    ],
  };
}

export function teamActorSql(actor: CurrentActor): Prisma.Sql {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  return Prisma.sql`(
    ${teamSupervisorSql(actor)}
    OR EXISTS (
      SELECT 1 FROM "team_member"
      WHERE "team_member"."teamId" = "team"."id"
        AND "team_member"."studentId" = ${actor.id}
    )
  )`;
}

export function teamRecordActorSql(actor: CurrentActor): Prisma.Sql {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  return teamMemberSql(actor.id);
}

export function teamMemberSql(actorId: string): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "team_member"
    WHERE "team_member"."teamId" = "team"."id"
      AND "team_member"."studentId" = ${actorId}
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
