import { Prisma } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  teamSupervisorSql,
  teamSupervisorWhere,
} from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

export function teamActorWhere(actor: CurrentActor): Prisma.ProjectTeamWhereInput {
  if (actor.role === "ADMIN") return {};
  const now = new Date();
  return {
    AND: [
      { OR: [
        { project: { program: { endsAt: { gt: now } } } },
        { confirmedAt: { not: null } },
      ] },
      { OR: [
        ...(actor.role === "ADVISOR" ? [{ project: { advisors: { some: { userId: actor.id } } } }] : []),
        teamSupervisorWhere(actor),
        { memberships: { some: { userId: actor.id, endedAt: null } } },
      ] },
    ],
  };
}

export function teamActorSql(actor: CurrentActor): Prisma.Sql {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  if (actor.role === "ADVISOR") return Prisma.sql`EXISTS (
    SELECT 1 FROM "project_advisor"
    WHERE "project_advisor"."topicId" = "project_team"."projectId"
      AND "project_advisor"."userId" = ${actor.id}
  )`;
  return Prisma.sql`(
    ${teamSupervisorSql(actor)}
    OR EXISTS (
      SELECT 1 FROM "project_team_membership"
      WHERE "project_team_membership"."projectTeamId" = "project_team"."id"
        AND "project_team_membership"."userId" = ${actor.id}
        AND "project_team_membership"."endedAt" IS NULL
    )
  )`;
}

export function teamRecordActorSql(actor: CurrentActor): Prisma.Sql {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  return teamMemberSql(actor.id);
}

export function teamMemberSql(actorId: string): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "project_team_membership"
    WHERE "project_team_membership"."projectTeamId" = "project_team"."id"
      AND "project_team_membership"."userId" = ${actorId}
      AND "project_team_membership"."endedAt" IS NULL
  )`;
}

export function validTeamAssigneesSql(assigneeIds: string[]): Prisma.Sql {
  if (assigneeIds.length === 0) return Prisma.sql`TRUE`;
  return Prisma.sql`(
    SELECT COUNT(DISTINCT "project_team_membership"."userId")
    FROM "project_team_membership"
    WHERE "project_team_membership"."projectTeamId" = "project_team"."id"
      AND "project_team_membership"."userId" IN (${Prisma.join(assigneeIds)})
      AND "project_team_membership"."endedAt" IS NULL
  ) = ${assigneeIds.length}`;
}
