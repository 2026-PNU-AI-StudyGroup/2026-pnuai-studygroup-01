import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  SharedRecruitmentContacts,
  StudentTeamRecruitmentPostApplications,
  StudentTeamRecruitmentPostList,
  StudentTeamRecruitmentReader,
} from "@/modules/student-team/application/manage-student-team-recruitment";
import {
  actionableRecruitmentApplicationCount,
  recruitmentApplicationState,
  recruitmentPostState,
} from "@/modules/student-team/domain/recruitment-post-state";

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
        members: { orderBy: [{ role: "asc" }, { joinedAt: "asc" }], select: { studentId: true, student: { select: { name: true } } } },
        _count: { select: { members: true, invitations: { where: { status: "PENDING" } } } },
      },
    });
    return teams.map(({ _count, members, ...team }) => ({
      ...team,
      members: members.map(({ studentId, student }) => ({ id: studentId, name: student.name })),
      memberCount: _count.members,
      pendingInvitationCount: _count.invitations,
    }));
  }

  async listPosts(
    actorId: string,
    requested: number,
  ): Promise<StudentTeamRecruitmentPostList> {
    const where: Prisma.StudentTeamRecruitmentPostWhereInput = {
      status: "OPEN",
      deadlineAt: { gt: new Date() },
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
            members: { where: { studentId: actorId }, select: { id: true }, take: 1 },
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
        isMember: team.members.length > 0,
        ownApplication: applications[0] ?? null,
      })),
    };
  }

  async listAuthoredPosts(actorId: string, requested: number, teamId?: string) {
    const where = { team: { leaderId: actorId, deletedAt: null, ...(teamId ? { id: teamId } : {}) } };
    const now = new Date();
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
        teamId: post.teamId,
        status: recruitmentPostState(post, now),
        teamName: team.name,
        topicTitle: "프로젝트 미지정 팀",
        memberCount: team._count.members,
        applicationCount: _count.applications,
        pendingApplicationCount: actionableRecruitmentApplicationCount(post, applications.length, now),
      })),
    };
  }

  async listReceivedApplications(actorId: string, teamId?: string) {
    const now = new Date();
    const applications = await this.client.studentTeamRecruitmentApplication.findMany({
      where: {
        status: "PENDING",
        post: {
          status: "OPEN",
          deadlineAt: { gt: now },
          team: { leaderId: actorId, deletedAt: null, ...(teamId ? { id: teamId } : {}) },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        message: true,
        desiredRole: true,
        sharedContacts: true,
        createdAt: true,
        student: { select: { name: true } },
        post: {
          select: {
            id: true,
            title: true,
            capacity: true,
            team: { select: { id: true, name: true, _count: { select: { members: true } } } },
          },
        },
      },
    });
    return applications.map(({ student, post, sharedContacts, ...application }) => ({
      ...application,
      studentName: student.name,
      postId: post.id,
      postTitle: post.title,
      teamId: post.team.id,
      teamName: post.team.name,
      memberCount: post.team._count.members,
      capacity: post.capacity,
      sharedContacts: sharedContacts as SharedRecruitmentContacts,
    }));
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
              status: true,
              deadlineAt: true,
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
        status: recruitmentApplicationState(application.status, post, new Date()),
        postTitle: post.title,
        teamName: post.team.name,
        topicTitle: "프로젝트 미지정 팀",
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
            desiredRole: true,
            sharedContacts: true,
            status: true,
            createdAt: true,
            decidedAt: true,
            student: { select: { name: true } },
          },
        },
      },
    });
    if (!post) return null;
    const now = new Date();
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      status: recruitmentPostState(post, now),
      teamName: post.team.name,
      topicTitle: "프로젝트 미지정 팀",
      applications: post.applications.map(({ student, sharedContacts, ...application }) => ({
        ...application,
        status: recruitmentApplicationState(application.status, post, now),
        studentName: student.name,
        sharedContacts: sharedContacts as SharedRecruitmentContacts,
      })),
    };
  }
}
