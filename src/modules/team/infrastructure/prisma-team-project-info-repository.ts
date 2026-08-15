import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  TeamProjectInfo,
  TeamProjectInfoRepository,
  TeamProjectInfoUpdateOutcome,
} from "@/modules/team/application/manage-team-project-info";
import { canEditTeamProjectInfo } from "@/modules/team/domain/team-project-info-policy";
import { teamActorWhere } from "@/modules/team/infrastructure/prisma-team-workspace-authorization";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";
import { effectiveProjectStatus } from "@/modules/topic/domain/project-lifecycle";

const teamProjectInfoSelect = {
  id: true,
  name: true,
  confirmedAt: true,
  project: {
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      managerId: true,
      program: { select: { name: true, endsAt: true } },
      assistants: { select: { userId: true } },
    },
  },
  memberships: {
    where: { endedAt: null },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  },
} as const;

type TeamProjectInfoRow = Awaited<ReturnType<typeof findTeamProjectInfoRow>>;

function findTeamProjectInfoRow(
  client: Pick<PrismaClient, "projectTeam">,
  teamId: string,
  actor: CurrentActor,
) {
  return client.projectTeam.findFirst({
    where: { OR: [{ id: teamId }, { projectId: teamId }], ...teamActorWhere(actor) },
    select: teamProjectInfoSelect,
  });
}

function actorMemberRole(row: NonNullable<TeamProjectInfoRow>, actorId: string) {
  return row.memberships.find(({ userId }) => userId === actorId)?.role ?? null;
}

function toProjectInfo(row: NonNullable<TeamProjectInfoRow>, actor: CurrentActor): TeamProjectInfo {
  return {
    teamId: row.id,
    programName: row.project.program.name,
    teamName: row.name,
    title: row.project.title,
    description: row.project.description,
    status: (() => {
      const status = effectiveProjectStatus({ status: row.project.status, programEndsAt: row.project.program.endsAt, confirmedAt: row.confirmedAt });
      return status === "PENDING_APPROVAL" || status === "REJECTED" ? "FORMING" : status;
    })(),
    canEdit: canEditTeamProjectInfo(actor, {
      professorId: row.project.managerId ?? "",
      assistantIds: row.project.assistants.map(({ userId }) => userId),
      actorMemberRole: actorMemberRole(row, actor.id),
    }),
  };
}

export class PrismaTeamProjectInfoRepository implements TeamProjectInfoRepository {
  constructor(private readonly client: PrismaClient) {}

  async findForActor(teamId: string, actor: CurrentActor): Promise<TeamProjectInfo | null> {
    const row = await findTeamProjectInfoRow(this.client, teamId, actor);
    return row ? toProjectInfo(row, actor) : null;
  }

  update(
    teamId: string,
    actor: CurrentActor,
    input: { title: string; description: string },
  ): Promise<TeamProjectInfoUpdateOutcome> {
    return this.client.$transaction(async (transaction) => {
      const lockedTeams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "project_team"."id"
        FROM "project_team"
        JOIN "topic" ON "topic"."id" = "project_team"."projectId"
        WHERE "project_team"."id" = ${teamId}
        FOR UPDATE OF "project_team", "topic"
      `);
      if (!lockedTeams[0]) return "NOT_FOUND";
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "project_team_membership" WHERE "projectTeamId" = ${teamId} FOR UPDATE
      `);
      const row = await findTeamProjectInfoRow(transaction, teamId, actor);
      if (!row) return "NOT_FOUND";
      if (row.project.status !== "ACTIVE" || row.project.program.endsAt <= new Date() || !row.confirmedAt) return "NOT_IN_PROGRESS";
      if (!toProjectInfo(row, actor).canEdit) return "FORBIDDEN";
      await transaction.topic.update({
        where: { id: row.project.id },
        data: { title: input.title, description: input.description },
      });
      await enqueueTranslations(transaction, [input.title, input.description]);
      return "UPDATED";
    });
  }
}
