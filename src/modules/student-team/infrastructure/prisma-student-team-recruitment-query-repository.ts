import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  StudentTeamRecruitmentPostApplications,
  StudentTeamRecruitmentPostList,
  StudentTeamRecruitmentReader,
} from "@/modules/student-team/application/manage-student-team-recruitment";

const pageOf = (requested: number, total: number) => {
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(
    Number.isSafeInteger(requested) && requested > 0 ? requested : 1,
    totalPages,
  );
  return { page, totalPages };
};

export class PrismaStudentTeamRecruitmentQueryRepository
  implements StudentTeamRecruitmentReader
{
  constructor(private readonly client: PrismaClient) {}

  async listLeaderTeams(actorId: string) {
    const teams = await this.client.studentTeam.findMany({
      where: { leaderId: actorId, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true } },
      },
    });
    return teams.map(({ _count, ...team }) => ({
      ...team,
      memberCount: _count.members,
    }));
  }

  async listPosts(
    actorId: string,
    requested: number,
  ): Promise<StudentTeamRecruitmentPostList> {
    const where: Prisma.StudentTeamRecruitmentPostWhereInput = {
      status: "OPEN",
      team: { deletedAt: null },
    };
    const total = await this.client.studentTeamRecruitmentPost.count({ where });
    const { page, totalPages } = pageOf(requested, total);
    const posts = await this.client.studentTeamRecruitmentPost.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 20,
      include: {
        author: { select: { name: true } },
        team: {
          select: {
            name: true,
            _count: { select: { members: true } },
          },
        },
        applications: {
          where: { studentId: actorId },
          select: { status: true },
        },
      },
    });
    return {
      total,
      page,
      totalPages,
      posts: posts.map(({ team, author, applications, ...post }) => ({
        ...post,
        teamName: team.name,
        topicTitle: "프로젝트 지원 전 팀",
        authorName: author.name,
        memberCount: team._count.members,
        canApply: team._count.members < post.capacity,
        ownApplication: applications[0] ?? null,
      })),
    };
  }

  async listAuthoredPosts(actorId: string, requested: number) {
    const where = { authorId: actorId };
    const total = await this.client.studentTeamRecruitmentPost.count({ where });
    const { page, totalPages } = pageOf(requested, total);
    const posts = await this.client.studentTeamRecruitmentPost.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 20,
      include: {
        team: {
          select: {
            name: true,
            _count: { select: { members: true } },
          },
        },
        applications: {
          where: { status: "PENDING" },
          select: { id: true },
        },
        _count: { select: { applications: true } },
      },
    });
    return {
      total,
      page,
      totalPages,
      posts: posts.map(({ team, applications, _count, ...post }) => ({
        ...post,
        teamName: team.name,
        topicTitle: "지속형 팀",
        memberCount: team._count.members,
        applicationCount: _count.applications,
        pendingApplicationCount: applications.length,
      })),
    };
  }

  async listApplicationHistory(actorId: string, requested: number) {
    const where = { studentId: actorId };
    const total =
      await this.client.studentTeamRecruitmentApplication.count({ where });
    const { page, totalPages } = pageOf(requested, total);
    const applications =
      await this.client.studentTeamRecruitmentApplication.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * 20,
        take: 20,
        select: {
          id: true,
          status: true,
          createdAt: true,
          decidedAt: true,
          post: {
            select: {
              title: true,
              author: { select: { name: true } },
              team: { select: { name: true } },
            },
          },
        },
      });
    return {
      total,
      page,
      totalPages,
      applications: applications.map(({ post, ...application }) => ({
        ...application,
        postTitle: post.title,
        teamName: post.team.name,
        topicTitle: "지속형 팀",
        recruiterName: post.author.name,
      })),
    };
  }

  async findPostApplications(
    postId: string,
    actorId: string,
    isAdmin: boolean,
  ): Promise<StudentTeamRecruitmentPostApplications | null> {
    const post = await this.client.studentTeamRecruitmentPost.findFirst({
      where: {
        id: postId,
        ...(isAdmin ? {} : { team: { leaderId: actorId } }),
      },
      include: {
        team: { select: { name: true } },
        applications: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            message: true,
            skills: true,
            desiredRole: true,
            availability: true,
            status: true,
            createdAt: true,
            decidedAt: true,
            student: { select: { name: true } },
          },
        },
      },
    });
    if (!post) return null;
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      status: post.status,
      teamName: post.team.name,
      topicTitle: "지속형 팀",
      applications: post.applications.map(({ student, ...application }) => ({
        ...application,
        studentName: student.name,
      })),
    };
  }
}
