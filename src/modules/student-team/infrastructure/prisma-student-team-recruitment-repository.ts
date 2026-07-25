import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  StudentTeamRecruitmentPostApplications,
  StudentTeamRecruitmentPostList,
  StudentTeamRecruitmentRepository,
} from "@/modules/student-team/application/manage-student-team-recruitment";

const pageOf = (requested: number, total: number) => {
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(Number.isSafeInteger(requested) && requested > 0 ? requested : 1, totalPages);
  return { page, totalPages };
};

export class PrismaStudentTeamRecruitmentRepository implements StudentTeamRecruitmentRepository {
  constructor(private readonly client: PrismaClient) {}

  async listLeaderTeams(actorId: string) {
    const teams = await this.client.studentTeam.findMany({
      where: { leaderId: actorId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, _count: { select: { members: true } } },
    });
    return teams.map(({ _count, ...team }) => ({ ...team, memberCount: _count.members }));
  }

  async listPosts(actorId: string, requested: number): Promise<StudentTeamRecruitmentPostList> {
    const where: Prisma.StudentTeamRecruitmentPostWhereInput = { status: "OPEN", team: { deletedAt: null } };
    const total = await this.client.studentTeamRecruitmentPost.count({ where });
    const { page, totalPages } = pageOf(requested, total);
    const posts = await this.client.studentTeamRecruitmentPost.findMany({
      where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20,
      include: {
        author: { select: { name: true } },
        team: { select: { name: true, _count: { select: { members: true } } } },
        applications: { where: { studentId: actorId }, select: { status: true } },
      },
    });
    return {
      total, page, totalPages,
      posts: posts.map(({ team, author, applications, ...post }) => ({
        ...post, teamName: team.name, topicTitle: "프로젝트 지원 전 팀", authorName: author.name,
        memberCount: team._count.members, canApply: team._count.members < post.capacity,
        ownApplication: applications[0] ?? null,
      })),
    };
  }

  async listAuthoredPosts(actorId: string, requested: number) {
    const where = { authorId: actorId };
    const total = await this.client.studentTeamRecruitmentPost.count({ where });
    const { page, totalPages } = pageOf(requested, total);
    const posts = await this.client.studentTeamRecruitmentPost.findMany({
      where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20,
      include: {
        team: { select: { name: true, _count: { select: { members: true } } } },
        applications: { where: { status: "PENDING" }, select: { id: true } },
        _count: { select: { applications: true } },
      },
    });
    return {
      total, page, totalPages,
      posts: posts.map(({ team, applications, _count, ...post }) => ({
        ...post, teamName: team.name, topicTitle: "지속형 팀", memberCount: team._count.members,
        applicationCount: _count.applications, pendingApplicationCount: applications.length,
      })),
    };
  }

  async listApplicationHistory(actorId: string, requested: number) {
    const where = { studentId: actorId };
    const total = await this.client.studentTeamRecruitmentApplication.count({ where });
    const { page, totalPages } = pageOf(requested, total);
    const applications = await this.client.studentTeamRecruitmentApplication.findMany({
      where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20,
      select: {
        id: true, status: true, createdAt: true, decidedAt: true,
        post: { select: { title: true, author: { select: { name: true } }, team: { select: { name: true } } } },
      },
    });
    return {
      total, page, totalPages,
      applications: applications.map(({ post, ...application }) => ({
        ...application, postTitle: post.title, teamName: post.team.name, topicTitle: "지속형 팀", recruiterName: post.author.name,
      })),
    };
  }

  async findPostApplications(postId: string, actorId: string, isAdmin: boolean): Promise<StudentTeamRecruitmentPostApplications | null> {
    const post = await this.client.studentTeamRecruitmentPost.findFirst({
      where: { id: postId, ...(isAdmin ? {} : { team: { leaderId: actorId } }) },
      include: {
        team: { select: { name: true } },
        applications: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, message: true, skills: true, desiredRole: true, availability: true,
            status: true, createdAt: true, decidedAt: true, student: { select: { name: true } },
          },
        },
      },
    });
    if (!post) return null;
    return {
      id: post.id, title: post.title, content: post.content, status: post.status,
      teamName: post.team.name, topicTitle: "지속형 팀",
      applications: post.applications.map(({ student, ...application }) => ({ ...application, studentName: student.name })),
    };
  }

  createPost(input: { teamId: string; leaderId: string; title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string; capacity: number }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "student_team" WHERE "id" = ${input.teamId}
          AND "leaderId" = ${input.leaderId} AND "deletedAt" IS NULL FOR UPDATE
      `);
      if (!teams[0] || await transaction.studentTeamMember.count({ where: { teamId: input.teamId } }) >= input.capacity) return false;
      await transaction.studentTeamRecruitmentPost.create({ data: { id: randomUUID(), authorId: input.leaderId, ...input } });
      return true;
    });
  }

  apply(input: { postId: string; studentId: string; message: string; skills: string[]; desiredRole: string; availability: string; appliedAt: Date }): Promise<"CREATED" | "UNAVAILABLE" | "ALREADY_APPLIED" | "ALREADY_MEMBER"> {
    return this.client.$transaction(async (transaction) => {
      const posts = await transaction.$queryRaw<Array<{ id: string; teamId: string; capacity: number }>>(Prisma.sql`
        SELECT "student_team_recruitment_post"."id", "teamId", "capacity"
        FROM "student_team_recruitment_post"
        JOIN "student_team" ON "student_team"."id" = "student_team_recruitment_post"."teamId"
        WHERE "student_team_recruitment_post"."id" = ${input.postId}
          AND "student_team_recruitment_post"."status" = 'OPEN'
          AND "student_team"."deletedAt" IS NULL
        FOR UPDATE OF "student_team_recruitment_post", "student_team"
      `);
      const post = posts[0];
      if (!post || await transaction.studentTeamMember.count({ where: { teamId: post.teamId } }) >= post.capacity) return "UNAVAILABLE";
      if (await transaction.studentTeamMember.findUnique({ where: { teamId_studentId: { teamId: post.teamId, studentId: input.studentId } }, select: { id: true } })) return "ALREADY_MEMBER";
      if (await transaction.studentTeamRecruitmentApplication.findUnique({ where: { postId_studentId: { postId: input.postId, studentId: input.studentId } }, select: { id: true } })) return "ALREADY_APPLIED";
      await transaction.studentTeamRecruitmentApplication.create({ data: { id: randomUUID(), ...input, updatedAt: input.appliedAt } });
      return "CREATED";
    });
  }

  decide(input: { applicationId: string; actorId: string; isAdmin: boolean; decision: "ACCEPT" | "REJECT"; decidedAt: Date }): Promise<"ACCEPTED" | "REJECTED" | "UNAVAILABLE" | "FORBIDDEN"> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string; studentId: string; postId: string; teamId: string; leaderId: string; capacity: number; status: string }>>(Prisma.sql`
        SELECT a."id", a."studentId", a."postId", p."teamId", t."leaderId", p."capacity", a."status"
        FROM "student_team_recruitment_application" a
        JOIN "student_team_recruitment_post" p ON p."id" = a."postId"
        JOIN "student_team" t ON t."id" = p."teamId"
        WHERE a."id" = ${input.applicationId} AND t."deletedAt" IS NULL
        FOR UPDATE OF a, p, t
      `);
      const target = rows[0];
      if (!target || target.status !== "PENDING") return "UNAVAILABLE";
      if (!input.isAdmin && target.leaderId !== input.actorId) return "FORBIDDEN";
      if (input.decision === "REJECT") {
        await transaction.studentTeamRecruitmentApplication.update({ where: { id: target.id }, data: { status: "REJECTED", decidedAt: input.decidedAt } });
        return "REJECTED";
      }
      if (await transaction.studentTeamMember.count({ where: { teamId: target.teamId } }) >= target.capacity) return "UNAVAILABLE";
      await transaction.studentTeamMember.upsert({
        where: { teamId_studentId: { teamId: target.teamId, studentId: target.studentId } },
        create: { id: randomUUID(), teamId: target.teamId, studentId: target.studentId, role: "MEMBER", joinedAt: input.decidedAt },
        update: {},
      });
      await transaction.studentTeamRecruitmentApplication.update({ where: { id: target.id }, data: { status: "ACCEPTED", decidedAt: input.decidedAt } });
      if (await transaction.studentTeamMember.count({ where: { teamId: target.teamId } }) >= target.capacity) {
        await transaction.studentTeamRecruitmentPost.update({ where: { id: target.postId }, data: { status: "CLOSED" } });
        await transaction.studentTeamRecruitmentApplication.updateMany({ where: { postId: target.postId, status: "PENDING" }, data: { status: "REJECTED", decidedAt: input.decidedAt } });
      }
      return "ACCEPTED";
    });
  }
}
