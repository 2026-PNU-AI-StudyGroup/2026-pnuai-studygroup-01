import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  AuthoredRecruitmentPostPage,
  RecruitmentApplicationHistoryPage,
  RecruitmentPostApplications,
  RecruitmentPostListResult,
  RecruitmentReader,
  RecruitmentReviewer,
} from "@/modules/recruitment/application/manage-recruitment";

const pagination = (requestedPage: number, total: number) => {
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1,
    totalPages,
  );
  return { page, totalPages };
};

export class PrismaRecruitmentQueryRepository implements RecruitmentReader {
  constructor(private readonly client: PrismaClient) {}

  async listFormingTeams(
    actorId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const now = new Date();
    const teams = await this.client.team.findMany({
      where: {
        status: "FORMING",
        members: { some: { studentId: actorId } },
        topic: {
          status: "PUBLISHED",
          recruitmentStartsAt: { lte: now },
          recruitmentEndsAt: { gt: now },
        },
      },
      select: {
        id: true,
        name: true,
        topic: { select: { capacity: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
    return teams
      .filter((team) => team._count.members < team.topic.capacity)
      .map(({ id, name }) => ({ id, name }));
  }

  async listPosts(
    actorId: string,
    requestedPage: number,
  ): Promise<RecruitmentPostListResult> {
    const now = new Date();
    const visible: Prisma.RecruitmentPostWhereInput = {
      status: "OPEN",
      team: {
        status: "FORMING",
        topic: {
          status: "PUBLISHED",
          recruitmentStartsAt: { lte: now },
          recruitmentEndsAt: { gt: now },
        },
      },
    };
    const total = await this.client.recruitmentPost.count({ where: visible });
    const { page, totalPages } = pagination(requestedPage, total);
    const posts = await this.client.recruitmentPost.findMany({
      where: visible,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 20,
      include: {
        author: { select: { name: true } },
        team: {
          select: {
            name: true,
            topic: {
              select: {
                title: true,
                capacity: true,
                status: true,
                recruitmentStartsAt: true,
                recruitmentEndsAt: true,
              },
            },
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
      page,
      totalPages,
      total,
      posts: posts.map((post) => ({
        id: post.id,
        teamId: post.teamId,
        teamName: post.team.name,
        topicTitle: post.team.topic.title,
        authorId: post.authorId,
        authorName: post.author.name,
        title: post.title,
        content: post.content,
        requiredSkills: post.requiredSkills,
        roleNeeded: post.roleNeeded,
        availability: post.availability,
        memberCount: post.team._count.members,
        capacity: post.team.topic.capacity,
        createdAt: post.createdAt,
        canApply:
          post.team.topic.status === "PUBLISHED" &&
          post.team.topic.recruitmentStartsAt <= now &&
          post.team.topic.recruitmentEndsAt > now,
        ownApplication: post.applications[0] ?? null,
      })),
    };
  }

  async listAuthoredPosts(
    authorId: string,
    requestedPage: number,
  ): Promise<AuthoredRecruitmentPostPage> {
    const where: Prisma.RecruitmentPostWhereInput = { authorId };
    const total = await this.client.recruitmentPost.count({ where });
    const { page, totalPages } = pagination(requestedPage, total);
    const posts = await this.client.recruitmentPost.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 20,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        team: {
          select: {
            name: true,
            topic: { select: { title: true, capacity: true } },
            _count: { select: { members: true } },
          },
        },
        _count: { select: { applications: true } },
        applications: {
          where: { status: "PENDING" },
          select: { id: true },
        },
      },
    });
    return {
      page,
      totalPages,
      total,
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        status: post.status,
        createdAt: post.createdAt,
        teamName: post.team.name,
        topicTitle: post.team.topic.title,
        memberCount: post.team._count.members,
        capacity: post.team.topic.capacity,
        applicationCount: post._count.applications,
        pendingApplicationCount: post.applications.length,
      })),
    };
  }

  async findPostApplications(
    postId: string,
    viewer: RecruitmentReviewer,
  ): Promise<RecruitmentPostApplications | null> {
    const post = await this.client.recruitmentPost.findFirst({
      where: {
        id: postId,
        ...(viewer.isAdmin ? {} : { authorId: viewer.actorId }),
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        team: {
          select: { name: true, topic: { select: { title: true } } },
        },
        applications: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            status: true,
            createdAt: true,
            decidedAt: true,
            student: { select: { name: true } },
            topicApplication: {
              select: {
                message: true,
                skills: true,
                desiredRole: true,
                availability: true,
              },
            },
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
      topicTitle: post.team.topic.title,
      applications: post.applications.map(
        ({ student, topicApplication, ...application }) => ({
          ...application,
          studentName: student.name,
          ...topicApplication,
        }),
      ),
    };
  }

  async listApplicationHistory(
    actorId: string,
    requestedPage: number,
  ): Promise<RecruitmentApplicationHistoryPage> {
    const where = { studentId: actorId };
    const total = await this.client.recruitmentApplication.count({ where });
    const { page, totalPages } = pagination(requestedPage, total);
    const applications = await this.client.recruitmentApplication.findMany({
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
            team: {
              select: { name: true, topic: { select: { title: true } } },
            },
          },
        },
      },
    });
    return {
      page,
      totalPages,
      total,
      applications: applications.map(({ post, ...application }) => ({
        ...application,
        postTitle: post.title,
        teamName: post.team.name,
        topicTitle: post.team.topic.title,
        recruiterName: post.author.name,
      })),
    };
  }

  async findDecisionTarget(
    id: string,
    viewer: RecruitmentReviewer,
  ): Promise<string | null> {
    const application = await this.client.recruitmentApplication.findFirst({
      where: {
        id,
        status: "PENDING",
        post: {
          ...(viewer.isAdmin ? {} : { authorId: viewer.actorId }),
          status: "OPEN",
          team: { status: "FORMING", topic: { status: "PUBLISHED" } },
        },
      },
      select: { topicApplicationId: true },
    });
    return application?.topicApplicationId ?? null;
  }
}
