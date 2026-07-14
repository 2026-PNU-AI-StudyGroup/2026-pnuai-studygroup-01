import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { TeamConfirmationWriter } from "@/modules/team/application/confirm-team";
import type {
  DiscussionPostWriter,
  MilestoneStatus,
  MilestoneWriter,
  ProgressUpdateWriter,
  TeamListItem,
  TeamWorkspace,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";

const teamListInclude = {
  topic: { select: { title: true } },
  members: { select: { id: true } },
  milestones: { select: { status: true } },
} satisfies Prisma.TeamInclude;

export class PrismaTeamWorkspaceRepository
  implements
    TeamWorkspaceReader,
    MilestoneWriter,
    ProgressUpdateWriter,
    DiscussionPostWriter,
    TeamConfirmationWriter
{
  constructor(private readonly client: PrismaClient) {}

  confirm(teamId: string, actor: CurrentActor): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const decidedAt = new Date();
      const rows = await transaction.$queryRaw<Array<{ id: string; topicId: string }>>(Prisma.sql`
        UPDATE "team" SET "status" = 'CONFIRMED', "updatedAt" = ${decidedAt}
        WHERE "id" = ${teamId} AND "status" = 'FORMING'
          AND EXISTS (SELECT 1 FROM "team_member" WHERE "teamId" = "team"."id")
          AND (${actor.role}::"UserRole" = 'ADMIN' OR (${actor.role}::"UserRole" = 'PROFESSOR' AND "professorId" = ${actor.id}))
        RETURNING "id", "topicId"
      `);
      const team = rows[0];
      if (!team) return false;
      await transaction.recruitmentPost.updateMany({ where: { teamId, status: "OPEN" }, data: { status: "CLOSED" } });
      await transaction.topicApplication.updateMany({ where: { topicId: team.topicId, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      await transaction.recruitmentApplication.updateMany({ where: { post: { teamId }, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      return true;
    });
  }

  async findWorkspaceForActor(
    teamId: string,
    actor: CurrentActor,
  ): Promise<TeamWorkspace | null> {
    const team = await this.client.team.findFirst({
      where: { id: teamId, ...teamActorWhere(actor) },
      include: {
        topic: { select: { title: true, author: { select: { name: true } } } },
        members: {
          orderBy: { joinedAt: "asc" },
          select: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
        milestones: {
          orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
          select: { id: true, title: true, dueAt: true, status: true },
        },
        progressUpdates: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            content: true,
            risk: true,
            nextAction: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
        discussionPosts: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
        reports: {
          where: { type: "FINAL" },
          take: 1,
          select: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              select: { decision: { select: { decision: true } } },
            },
          },
        },
      },
    });
    if (!team) {
      return null;
    }

    const completedMilestoneCount = team.milestones.filter(
      ({ status }) => status === "DONE",
    ).length;
    return {
      id: team.id,
      name: team.name,
      topicTitle: team.topic.title,
      status: team.status,
      professorName: team.topic.author.name,
      canClose: team.status === "CONFIRMED" && team.reports[0]?.versions[0]?.decision?.decision === "APPROVED",
      memberCount: team.members.length,
      milestoneCount: team.milestones.length,
      completedMilestoneCount,
      members: team.members.map(({ student }) => student),
      milestones: team.milestones,
      progressUpdates: team.progressUpdates.map(({ author, ...update }) => ({
        ...update,
        authorName: author.name,
      })),
      discussionPosts: team.discussionPosts.reverse().map(({ author, ...post }) => ({
        ...post,
        authorName: author.name,
      })),
    };
  }

  listForStudent(studentId: string): Promise<TeamListItem[]> {
    return this.list({ members: { some: { studentId } } });
  }

  listForProfessor(professorId: string): Promise<TeamListItem[]> {
    return this.list({ professorId });
  }

  listAll(): Promise<TeamListItem[]> {
    return this.list({});
  }

  createMilestone(input: {
    teamId: string;
    actor: CurrentActor;
    title: string;
    dueAt: Date;
  }): Promise<{ id: string } | null> {
    const id = randomUUID();
    const now = new Date();
    return this.client
      .$queryRaw<Array<{ id: string }>>(Prisma.sql`
        INSERT INTO "milestone" (
          "id", "teamId", "createdById", "title", "dueAt",
          "status", "createdAt", "updatedAt"
        )
        SELECT ${id}, "team"."id", ${input.actor.id}, ${input.title},
          ${input.dueAt}, 'TODO'::"MilestoneStatus", ${now}, ${now}
        FROM "team"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" <> 'CLOSED'
          AND ${teamActorSql(input.actor)}
        RETURNING "id"
      `)
      .then((rows) => rows[0] ?? null);
  }

  updateMilestoneStatus(
    id: string,
    status: MilestoneStatus,
    actor: CurrentActor,
  ): Promise<{ teamId: string } | null> {
    return this.client
      .$queryRaw<Array<{ teamId: string }>>(Prisma.sql`
        UPDATE "milestone"
        SET "status" = ${status}::"MilestoneStatus", "updatedAt" = ${new Date()}
        FROM "team"
        WHERE "milestone"."id" = ${id}
          AND "team"."id" = "milestone"."teamId"
          AND "team"."status" <> 'CLOSED'
          AND ${teamActorSql(actor)}
        RETURNING "milestone"."teamId"
      `)
      .then((rows) => rows[0] ?? null);
  }

  createProgressUpdate(input: {
    teamId: string;
    actor: CurrentActor;
    content: string;
    risk: string;
    nextAction: string;
  }): Promise<{ id: string } | null> {
    const id = randomUUID();
    const now = new Date();
    return this.client
      .$queryRaw<Array<{ id: string }>>(Prisma.sql`
        INSERT INTO "progress_update" (
          "id", "teamId", "authorId", "content", "risk", "nextAction", "createdAt"
        )
        SELECT ${id}, "team"."id", ${input.actor.id}, ${input.content},
          ${input.risk}, ${input.nextAction}, ${now}
        FROM "team"
        WHERE "team"."id" = ${input.teamId}
          AND "team"."status" <> 'CLOSED'
          AND ${teamActorSql(input.actor)}
        RETURNING "id"
      `)
      .then((rows) => rows[0] ?? null);
  }

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

  private async list(where: Prisma.TeamWhereInput): Promise<TeamListItem[]> {
    const teams = await this.client.team.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: teamListInclude,
    });
    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      topicTitle: team.topic.title,
      status: team.status,
      memberCount: team.members.length,
      milestoneCount: team.milestones.length,
      completedMilestoneCount: team.milestones.filter(
        ({ status }) => status === "DONE",
      ).length,
    }));
  }
}

function teamActorWhere(actor: CurrentActor): Prisma.TeamWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "PROFESSOR") return { professorId: actor.id };
  return { members: { some: { studentId: actor.id } } };
}

function teamActorSql(actor: CurrentActor): Prisma.Sql {
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
