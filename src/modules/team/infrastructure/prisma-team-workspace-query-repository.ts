import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  TeamListItem,
  TeamWorkspace,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";
import {
  teamSupervisorWhere,
} from "@/modules/project-assistant/infrastructure/project-supervisor-authorization";

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
  reports: {
    select: {
      versions: {
        take: 1,
        select: { id: true },
      },
    },
  },
} satisfies Prisma.TeamInclude;
const DISCUSSION_PAGE_SIZE = 50;

export class PrismaTeamWorkspaceQueryRepository
  implements TeamWorkspaceReader
{
  constructor(private readonly client: PrismaClient) {}

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
          id: true,
          title: true,
          recruitmentStartsAt: true,
          recruitmentEndsAt: true,
          executionStartsAt: true,
          executionEndsAt: true,
          submissionStartsAt: true,
          submissionEndsAt: true,
          program: { select: { advisorEnabled: true } },
          manager: { select: { name: true } },
          assistants: {
            where: { userId: actor.id },
            select: { id: true },
          },
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
      topicId: team.topic.id,
      name: team.name,
      topicTitle: team.topic.title,
      status: team.status,
      professorName: team.topic.manager!.name,
      advisorEnabled: team.topic.program.advisorEnabled,
      access: {
        isPrimaryAdvisor: team.professorId === actor.id,
        isAssistant: team.topic.assistants.length > 0,
        isTeamMember: team.members.some(({ student }) => student.id === actor.id),
        canSupervise: actor.role === "ADMIN" ||
          team.professorId === actor.id ||
          team.topic.assistants.length > 0,
        canContribute: actor.role === "ADMIN" ||
          team.members.some(({ student }) => student.id === actor.id),
      },
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
      reportCount: team.reports.length,
      submittedReportCount: team.reports.filter(
        (report) => report.versions.length > 0,
      ).length,
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

  listForActor(actor: CurrentActor): Promise<TeamListItem[]> {
    if (actor.role === "ADMIN") return this.listAll();
    return this.list({
      OR: [
        teamSupervisorWhere(actor),
        { members: { some: { studentId: actor.id } } },
      ],
    });
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
      reportCount: team.reports.length,
      submittedReportCount: team.reports.filter(
        (report) => report.versions.length > 0,
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
  return {
    OR: [
      teamSupervisorWhere(actor),
      { members: { some: { studentId: actor.id } } },
    ],
  };
}
