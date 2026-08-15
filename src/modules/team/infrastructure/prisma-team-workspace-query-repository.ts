import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  TeamListItem,
  TeamListPage,
  TeamWorkspace,
  TeamWorkspaceReader,
} from "@/modules/team/application/team-workspace-ports";
import { teamActorWhere } from "@/modules/team/infrastructure/prisma-team-workspace-authorization";
import { effectiveProjectStatus } from "@/modules/topic/domain/project-lifecycle";

const teamListInclude = {
  project: { select: { title: true, status: true, program: { select: { name: true, endsAt: true } } } },
  memberships: { where: { endedAt: null }, select: { id: true } },
  tasks: {
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      dueAt: true,
      status: true,
      completedAt: true,
      assignees: {
        orderBy: { assignedAt: "asc" },
        select: { user: { select: { id: true, name: true } } },
      },
    },
  },
  reports: {
    where: { required: true },
    select: {
      versions: {
        take: 1,
        select: { id: true },
      },
    },
  },
} satisfies Prisma.ProjectTeamInclude;
const DISCUSSION_PAGE_SIZE = 50;
type TeamListRow = Prisma.ProjectTeamGetPayload<{ include: typeof teamListInclude }>;

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
    const team = await this.client.projectTeam.findFirst({
      where: { projectId: teamId, ...teamActorWhere(actor) },
      include: {
        project: { select: {
          id: true,
          title: true,
          status: true,
          description: true,
          managerId: true,
          program: { select: { name: true, advisorEnabled: true, endsAt: true, recruitmentStartsAt: true, recruitmentEndsAt: true, executionStartsAt: true, executionEndsAt: true, submissionStartsAt: true, submissionEndsAt: true } },
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
        memberships: {
          where: { endedAt: null },
          orderBy: { joinedAt: "asc" },
          select: {
            role: true,
            user: {
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
                    phone: true,
                    kakao: true,
                    github: true,
                    instagram: true,
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
            completedAt: true,
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
            author: { select: { name: true, role: true } },
          },
        },
        reports: {
          where: { required: true },
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
        where: { projectTeamId: team.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (resolvedDiscussionPage - 1) * DISCUSSION_PAGE_SIZE,
        take: DISCUSSION_PAGE_SIZE,
        select: {
          id: true,
          authorId: true,
          content: true,
          createdAt: true,
          author: { select: { name: true, role: true } },
        },
      });
    const assistantIds = new Set(team.project.assistants.map(({ userId }) => userId));
    return {
      id: team.id,
      topicId: team.project.id,
      topicDescription: team.project.description,
      name: team.name,
      programName: team.project.program.name,
      topicTitle: team.project.title,
      status: projectTeamPhase(team),
      professorName: team.project.manager!.name,
      professor: team.project.manager!,
      advisorEnabled: team.project.program.advisorEnabled,
      access: {
        isPrimaryAdvisor: team.project.managerId === actor.id,
        isAssistant: team.project.assistants.some(({ userId }) => userId === actor.id),
        isTeamMember: team.memberships.some(({ user }) => user.id === actor.id),
        isTeamLeader: team.memberships.some(({ role, user }) =>
          user.id === actor.id && role === "LEADER"
        ),
        canSupervise: actor.role === "ADMIN" ||
          team.project.managerId === actor.id ||
          team.project.assistants.some(({ userId }) => userId === actor.id),
        canContribute: team.project.program.endsAt > new Date() && (actor.role === "ADMIN" ||
          (team.project.status === "ACTIVE" && team.memberships.some(({ user }) => user.id === actor.id))),
      },
      schedule: {
        recruitmentStartsAt: team.project.program.recruitmentStartsAt,
        programRecruitmentEndsAt: team.project.program.recruitmentEndsAt,
        executionStartsAt: team.project.program.executionStartsAt,
        executionEndsAt: team.project.program.executionEndsAt,
        submissionStartsAt: team.project.program.submissionStartsAt,
        submissionEndsAt: team.project.program.submissionEndsAt,
      },
      memberCount: team.memberships.length,
      taskCount: team.tasks.length,
      completedTaskCount,
      reportCount: team.reports.length,
      submittedReportCount: team.reports.filter(
        (report) => report.versions.length > 0,
      ).length,
      assistants: team.project.assistants.map(({ user }) => user),
      members: team.memberships.map(({ role, user: { studentProfile, profileImage, ...user } }) => ({
        ...user,
        role,
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
        authorRole: assistantIds.has(post.authorId)
          ? "ASSISTANT" as const
          : post.authorId === team.project.managerId || author.role === "PROFESSOR"
            ? "PROFESSOR" as const
            : author.role === "ADMIN"
              ? "ADMIN" as const
              : "STUDENT" as const,
      })),
      discussionPage: resolvedDiscussionPage,
      discussionTotalPages,
      discussionTotal: team._count.discussionPosts,
    };
  }

  listForStudent(studentId: string): Promise<TeamListItem[]> {
    return this.list({ memberships: { some: { userId: studentId, endedAt: null } } });
  }

  listForProfessor(professorId: string): Promise<TeamListItem[]> {
    return this.list({ project: { managerId: professorId } });
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
    const now = new Date();
    const statusWhere: Prisma.ProjectTeamWhereInput = status === "ACTIVE"
      ? { project: { program: { endsAt: { gt: now } } } }
      : status === "COMPLETED"
        ? { confirmedAt: { not: null }, project: { program: { endsAt: { lte: now } } } }
        : {};
    const where: Prisma.ProjectTeamWhereInput = { AND: [visibility, statusWhere] };
    const [total, all, active, completed] = await Promise.all([
      this.client.projectTeam.count({ where }),
      this.client.projectTeam.count({ where: visibility }),
      this.client.projectTeam.count({ where: { AND: [visibility, { project: { program: { endsAt: { gt: now } } } }] } }),
      this.client.projectTeam.count({ where: { AND: [visibility, { confirmedAt: { not: null }, project: { program: { endsAt: { lte: now } } } }] } }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const teams = await this.client.projectTeam.findMany({
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

  private async list(where: Prisma.ProjectTeamWhereInput): Promise<TeamListItem[]> {
    const teams = await this.client.projectTeam.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: teamListInclude,
    });
    return teams.map(toTeamListItem);
  }
}

function toTeamListItem(team: TeamListRow): TeamListItem {
  return {
      id: team.projectId,
      name: team.name,
      programName: team.project.program.name,
      topicTitle: team.project.title,
      status: projectTeamPhase(team),
      memberCount: team.memberships.length,
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

function projectTeamPhase(team: Pick<TeamListRow, "confirmedAt" | "project">): TeamListItem["status"] {
  const status = effectiveProjectStatus({
    status: team.project.status,
    programEndsAt: team.project.program.endsAt,
    confirmedAt: team.confirmedAt,
  });
  return status === "PENDING_APPROVAL" || status === "REJECTED" ? "FORMING" : status;
}
