import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  TeamListItem,
  TeamListPage,
  TeamWorkspace,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";
import { teamActorWhere } from "@/modules/team/infrastructure/prisma-team-workspace-authorization";

const teamListInclude = {
  topic: { select: { title: true } },
  members: { select: { id: true } },
  tasks: {
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
type TeamListRow = Prisma.TeamGetPayload<{ include: typeof teamListInclude }>;

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
          executionStartsAt: true,
          executionEndsAt: true,
          submissionStartsAt: true,
          submissionEndsAt: true,
          program: { select: { advisorEnabled: true, recruitmentEndsAt: true } },
          manager: {
            select: {
              id: true,
              name: true,
              profileImage: { select: { updatedAt: true } },
            },
          },
          assistants: {
            orderBy: { createdAt: "asc" },
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: { select: { updatedAt: true } },
                },
              },
            },
          },
        } },
        members: {
          orderBy: { joinedAt: "asc" },
          select: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
                studentNumber: true,
                grade: true,
                phoneNumber: true,
                contactEmail: true,
                profileImage: { select: { updatedAt: true } },
                studentProfile: {
                  select: {
                    interests: true,
                    skills: true,
                    desiredRole: true,
                    availability: true,
                    bio: true,
                  },
                },
              },
            },
          },
        },
        tasks: {
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

    const completedTaskCount = team.tasks.filter(
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
      professor: team.topic.manager!,
      advisorEnabled: team.topic.program.advisorEnabled,
      access: {
        isPrimaryAdvisor: team.professorId === actor.id,
        isAssistant: team.topic.assistants.some(({ userId }) => userId === actor.id),
        isTeamMember: team.members.some(({ student }) => student.id === actor.id),
        canSupervise: actor.role === "ADMIN" ||
          team.professorId === actor.id ||
          team.topic.assistants.some(({ userId }) => userId === actor.id),
        canContribute: actor.role === "ADMIN" ||
          team.members.some(({ student }) => student.id === actor.id),
      },
      schedule: {
        recruitmentStartsAt: team.topic.recruitmentStartsAt,
        programRecruitmentEndsAt: team.topic.program.recruitmentEndsAt,
        executionStartsAt: team.topic.executionStartsAt,
        executionEndsAt: team.topic.executionEndsAt,
        submissionStartsAt: team.topic.submissionStartsAt,
        submissionEndsAt: team.topic.submissionEndsAt,
      },
      canClose: team.status === "CONFIRMED" && team.reports.length > 0 && team.reports.every(
        (report) => report.versions[0]?.decision?.decision === "APPROVED",
      ),
      memberCount: team.members.length,
      taskCount: team.tasks.length,
      completedTaskCount,
      reportCount: team.reports.length,
      submittedReportCount: team.reports.filter(
        (report) => report.versions.length > 0,
      ).length,
      assistants: team.topic.assistants.map(({ user }) => user),
      members: team.members.map(({ student: { studentProfile, profileImage, ...student } }) => ({
        ...student,
        profileImage,
        profile: studentProfile,
      })),
      tasks: team.tasks.map((task) => ({
        ...task,
        assignees: task.assignees.map(({ user }) => user),
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
    return this.list(teamActorWhere(actor));
  }

  async listPageForActor(
    actor: CurrentActor,
    requestedPage: number,
    pageSize: number,
    status?: "ACTIVE" | "COMPLETED",
  ): Promise<TeamListPage> {
    const visibility = teamActorWhere(actor);
    const statusWhere: Prisma.TeamWhereInput = status === "ACTIVE"
      ? { status: { in: ["FORMING", "CONFIRMED"] } }
      : status === "COMPLETED"
        ? { status: "CLOSED" }
        : {};
    const where: Prisma.TeamWhereInput = { AND: [visibility, statusWhere] };
    const [total, all, active, completed] = await Promise.all([
      this.client.team.count({ where }),
      this.client.team.count({ where: visibility }),
      this.client.team.count({ where: { AND: [visibility, { status: { in: ["FORMING", "CONFIRMED"] } }] } }),
      this.client.team.count({ where: { AND: [visibility, { status: "CLOSED" }] } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const teams = await this.client.team.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: teamListInclude,
    });
    return {
      items: teams.map(toTeamListItem),
      page,
      totalPages,
      total,
      counts: { all, active, completed },
    };
  }

  private async list(where: Prisma.TeamWhereInput): Promise<TeamListItem[]> {
    const teams = await this.client.team.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: teamListInclude,
    });
    return teams.map(toTeamListItem);
  }
}

function toTeamListItem(team: TeamListRow): TeamListItem {
  return {
      id: team.id,
      name: team.name,
      topicTitle: team.topic.title,
      status: team.status,
      memberCount: team.members.length,
      taskCount: team.tasks.length,
      completedTaskCount: team.tasks.filter(
        ({ status }) => status === "DONE",
      ).length,
      reportCount: team.reports.length,
      submittedReportCount: team.reports.filter(
        (report) => report.versions.length > 0,
      ).length,
      tasks: team.tasks.map((task) => ({
        ...task,
        assignees: task.assignees.map(({ user }) => user),
      })),
    };
}
