import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type { TeamConfirmationWriter } from "@/modules/team/application/confirm-team";
import type {
  DiscussionPostWriter,
  MilestoneStatus,
  MilestoneWriter,
  TeamListItem,
  TeamWorkspace,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";

const teamListInclude = {
  topic: { select: { title: true } },
  members: { select: { id: true } },
  milestones: {
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      dueAt: true,
      status: true,
      assignees: {
        orderBy: { assignedAt: "asc" },
        select: { user: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.TeamInclude;
const DISCUSSION_PAGE_SIZE = 50;

export class PrismaTeamWorkspaceRepository
  implements
    TeamWorkspaceReader,
    MilestoneWriter,
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
      await transaction.teamApplicationDraft.deleteMany({ where: { topicId: team.topicId } });
      const applications = await transaction.topicApplication.findMany({
        where: { topicId: team.topicId, status: "PENDING" },
        select: { id: true, studentId: true, topic: { select: { title: true } } },
      });
      await transaction.recruitmentPost.updateMany({ where: { teamId, status: "OPEN" }, data: { status: "CLOSED" } });
      await transaction.topicApplication.updateMany({ where: { topicId: team.topicId, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      await transaction.recruitmentApplication.updateMany({ where: { post: { teamId }, status: "PENDING" }, data: { status: "REJECTED", decidedAt } });
      await createApplicationResultNotifications(transaction, applications.map((application) => ({
        applicationId: application.id,
        recipientId: application.studentId,
        topicTitle: application.topic.title,
        outcome: "REJECTED",
        createdAt: decidedAt,
      })));
      await transaction.auditLog.create({ data: {
        actorId: actor.id,
        action: "TEAM_CONFIRMED",
        targetType: "TEAM",
        targetId: team.id,
        metadata: { topicId: team.topicId },
        createdAt: decidedAt,
      } });
      return true;
    });
  }

  async findWorkspaceForActor(
    teamId: string,
    actor: CurrentActor,
    discussionPage = 1,
  ): Promise<TeamWorkspace | null> {
    const normalizedDiscussionPage = Number.isSafeInteger(discussionPage) && discussionPage > 0 ? discussionPage : 1;
    const team = await this.client.team.findFirst({
      where: { id: teamId, ...teamActorWhere(actor) },
      include: {
        topic: { select: {
          title: true,
          recruitmentStartsAt: true,
          recruitmentEndsAt: true,
          executionStartsAt: true,
          executionEndsAt: true,
          submissionStartsAt: true,
          submissionEndsAt: true,
          author: { select: { name: true } },
        } },
        members: {
          orderBy: { joinedAt: "asc" },
          select: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
        milestones: {
          orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            title: true,
            dueAt: true,
            status: true,
            assignees: {
              orderBy: { assignedAt: "asc" },
              select: { user: { select: { id: true, name: true } } },
            },
          },
        },
        discussionPosts: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (normalizedDiscussionPage - 1) * DISCUSSION_PAGE_SIZE,
          take: DISCUSSION_PAGE_SIZE,
          select: {
            id: true,
            authorId: true,
            content: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        },
        reports: {
          select: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
              select: { decision: { select: { decision: true } } },
            },
          },
        },
        _count: { select: { discussionPosts: true } },
      },
    });
    if (!team) {
      return null;
    }

    const completedMilestoneCount = team.milestones.filter(
      ({ status }) => status === "DONE",
    ).length;
    const discussionTotalPages = Math.max(1, Math.ceil(team._count.discussionPosts / DISCUSSION_PAGE_SIZE));
    const resolvedDiscussionPage = Math.min(normalizedDiscussionPage, discussionTotalPages);
    const discussionPosts = resolvedDiscussionPage === normalizedDiscussionPage
      ? team.discussionPosts
      : await this.client.discussionPost.findMany({
        where: { teamId: team.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (resolvedDiscussionPage - 1) * DISCUSSION_PAGE_SIZE,
        take: DISCUSSION_PAGE_SIZE,
        select: {
          id: true,
          authorId: true,
          content: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      });
    return {
      id: team.id,
      name: team.name,
      topicTitle: team.topic.title,
      status: team.status,
      professorName: team.topic.author.name,
      schedule: {
        recruitmentStartsAt: team.topic.recruitmentStartsAt,
        recruitmentEndsAt: team.topic.recruitmentEndsAt,
        executionStartsAt: team.topic.executionStartsAt,
        executionEndsAt: team.topic.executionEndsAt,
        submissionStartsAt: team.topic.submissionStartsAt,
        submissionEndsAt: team.topic.submissionEndsAt,
      },
      canClose: team.status === "CONFIRMED" && team.reports.length > 0 && team.reports.every(
        (report) => report.versions[0]?.decision?.decision === "APPROVED",
      ),
      memberCount: team.members.length,
      milestoneCount: team.milestones.length,
      completedMilestoneCount,
      members: team.members.map(({ student }) => student),
      milestones: team.milestones.map((milestone) => ({
        ...milestone,
        assignees: milestone.assignees.map(({ user }) => user),
      })),
      discussionPosts: discussionPosts.reverse().map(({ author, ...post }) => ({
        ...post,
        authorName: author.name,
      })),
      discussionPage: resolvedDiscussionPage,
      discussionTotalPages,
      discussionTotal: team._count.discussionPosts,
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
    assigneeIds: string[];
  }): Promise<{ id: string } | null> {
    const id = randomUUID();
    const now = new Date();
    const assigneeIds = [...new Set(input.assigneeIds)];
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          INSERT INTO "milestone" (
            "id", "teamId", "createdById", "title", "dueAt",
            "status", "createdAt", "updatedAt"
          )
          SELECT ${id}, "team"."id", ${input.actor.id}, ${input.title},
            ${input.dueAt}, 'TODO'::"MilestoneStatus", ${now}, ${now}
          FROM "team"
          WHERE "team"."id" = ${input.teamId}
            AND "team"."status" <> 'CLOSED'
            AND ${teamRecordActorSql(input.actor)}
            AND ${validTeamAssigneesSql(assigneeIds)}
          RETURNING "id"
        `);
      if (!rows[0]) return null;
      if (assigneeIds.length > 0) {
        await transaction.milestoneAssignee.createMany({
          data: assigneeIds.map((userId) => ({ milestoneId: id, userId })),
        });
      }
      return rows[0];
    });
  }

  updateMilestoneStatus(
    id: string,
    status: MilestoneStatus,
    assigneeIds: string[],
    actor: CurrentActor,
  ): Promise<{ teamId: string } | null> {
    const uniqueAssigneeIds = [...new Set(assigneeIds)];
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ teamId: string }>>(Prisma.sql`
        UPDATE "milestone"
        SET "status" = ${status}::"MilestoneStatus",
          "updatedAt" = ${new Date()}
        FROM "team"
        WHERE "milestone"."id" = ${id}
          AND "team"."id" = "milestone"."teamId"
          AND "team"."status" <> 'CLOSED'
          AND ${teamRecordActorSql(actor)}
          AND ${validTeamAssigneesSql(uniqueAssigneeIds)}
        RETURNING "milestone"."teamId"
      `);
      const milestone = rows[0];
      if (!milestone) return null;
      await transaction.milestoneAssignee.deleteMany({ where: { milestoneId: id } });
      if (uniqueAssigneeIds.length > 0) {
        await transaction.milestoneAssignee.createMany({
          data: uniqueAssigneeIds.map((userId) => ({ milestoneId: id, userId })),
        });
      }
      return milestone;
    });
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
      milestones: team.milestones.map((milestone) => ({
        ...milestone,
        assignees: milestone.assignees.map(({ user }) => user),
      })),
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

function teamRecordActorSql(actor: CurrentActor): Prisma.Sql {
  if (actor.role === "ADMIN") return Prisma.sql`TRUE`;
  if (actor.role === "PROFESSOR") return Prisma.sql`FALSE`;
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "team_member"
    WHERE "team_member"."teamId" = "team"."id"
      AND "team_member"."studentId" = ${actor.id}
  )`;
}

function validTeamAssigneesSql(assigneeIds: string[]): Prisma.Sql {
  if (assigneeIds.length === 0) return Prisma.sql`TRUE`;
  return Prisma.sql`(
    SELECT COUNT(DISTINCT "team_member"."studentId")
    FROM "team_member"
    WHERE "team_member"."teamId" = "team"."id"
      AND "team_member"."studentId" IN (${Prisma.join(assigneeIds)})
  ) = ${assigneeIds.length}`;
}
