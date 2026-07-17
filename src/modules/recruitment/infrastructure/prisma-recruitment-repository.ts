import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  AuthoredRecruitmentPostPage,
  RecruitmentApplicationHistoryPage,
  RecruitmentPostApplications,
  RecruitmentPostListResult,
  RecruitmentRepository,
  RecruitmentReviewer,
} from "@/modules/recruitment/application/manage-recruitment";

export class PrismaRecruitmentRepository implements RecruitmentRepository {
  constructor(private readonly client: PrismaClient) {}

  async listFormingTeams(actorId: string): Promise<Array<{ id: string; name: string }>> {
    const now = new Date();
    const teams = await this.client.team.findMany({
      where: { status: "FORMING", members: { some: { studentId: actorId } }, topic: { status: "PUBLISHED", recruitmentStartsAt: { lte: now }, recruitmentEndsAt: { gt: now } } },
      select: { id: true, name: true, topic: { select: { capacity: true } }, _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });
    return teams.filter((team) => team._count.members < team.topic.capacity).map(({ id, name }) => ({ id, name }));
  }

  async listPosts(actorId: string, requestedPage: number): Promise<RecruitmentPostListResult> {
    const now = new Date();
    const visible: Prisma.RecruitmentPostWhereInput = {
      status: "OPEN",
      team: { status: "FORMING", topic: { status: "PUBLISHED", recruitmentStartsAt: { lte: now }, recruitmentEndsAt: { gt: now } } },
    };
    const total = await this.client.recruitmentPost.count({ where: visible });
    const totalPages = Math.max(1, Math.ceil(total / 20));
    const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, totalPages);
    const posts = await this.client.recruitmentPost.findMany({
        where: visible, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20,
        include: {
          author: { select: { name: true } },
          team: { select: { name: true, topic: { select: { title: true, capacity: true, status: true, recruitmentStartsAt: true, recruitmentEndsAt: true } }, _count: { select: { members: true } } } },
          applications: { where: { studentId: actorId }, select: { status: true } },
        },
      });
    return {
      page, totalPages, total,
      posts: posts.map((post) => ({
        id: post.id, teamId: post.teamId, teamName: post.team.name, topicTitle: post.team.topic.title,
        authorId: post.authorId, authorName: post.author.name, title: post.title, content: post.content,
        requiredSkills: post.requiredSkills, roleNeeded: post.roleNeeded, availability: post.availability,
        memberCount: post.team._count.members, capacity: post.team.topic.capacity, createdAt: post.createdAt,
        canApply: post.team.topic.status === "PUBLISHED" && post.team.topic.recruitmentStartsAt <= now && post.team.topic.recruitmentEndsAt > now,
        ownApplication: post.applications[0] ?? null,
      })),
    };
  }

  async listAuthoredPosts(authorId: string, requestedPage: number): Promise<AuthoredRecruitmentPostPage> {
    const where: Prisma.RecruitmentPostWhereInput = { authorId };
    const total = await this.client.recruitmentPost.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / 20));
    const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, totalPages);
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
        applications: { where: { status: "PENDING" }, select: { id: true } },
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

  async findPostApplications(postId: string, viewer: RecruitmentReviewer): Promise<RecruitmentPostApplications | null> {
    const post = await this.client.recruitmentPost.findFirst({
      where: { id: postId, ...(viewer.isAdmin ? {} : { authorId: viewer.actorId }) },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        team: { select: { name: true, topic: { select: { title: true } } } },
        applications: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: {
            id: true,
            status: true,
            createdAt: true,
            decidedAt: true,
            student: { select: { name: true } },
            topicApplication: { select: { message: true, skills: true, desiredRole: true, availability: true } },
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
      applications: post.applications.map(({ student, topicApplication, ...application }) => ({
        ...application,
        studentName: student.name,
        ...topicApplication,
      })),
    };
  }

  async listApplicationHistory(actorId: string, requestedPage: number): Promise<RecruitmentApplicationHistoryPage> {
    const total = await this.client.recruitmentApplication.count({ where: { studentId: actorId } });
    const totalPages = Math.max(1, Math.ceil(total / 20));
    const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, totalPages);
    const applications = await this.client.recruitmentApplication.findMany({
      where: { studentId: actorId },
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
            team: { select: { name: true, topic: { select: { title: true } } } },
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

  createPost(input: { teamId: string; authorId: string; title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const now = new Date();
      const initial = await transaction.team.findUnique({ where: { id: input.teamId }, select: { topicId: true } });
      if (!initial) return false;
      const programs = await transaction.$queryRaw<Array<{ status: "DRAFT" | "OPEN" | "CLOSED" }>>(Prisma.sql`
        SELECT "project_program"."status"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${initial.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<Array<{ capacity: number }>>(Prisma.sql`
        SELECT "capacity" FROM "topic"
        WHERE "id" = ${initial.topicId} AND "status" = 'PUBLISHED'
          AND "recruitmentStartsAt" <= ${now} AND "recruitmentEndsAt" > ${now}
        FOR UPDATE
      `);
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "team"."id" FROM "team"
        WHERE "team"."id" = ${input.teamId} AND "team"."status" = 'FORMING'
          AND EXISTS (SELECT 1 FROM "team_member" WHERE "teamId" = "team"."id" AND "studentId" = ${input.authorId})
        FOR UPDATE
      `);
      const team = teams[0];
      const topic = topics[0];
      if (programs[0]?.status !== "OPEN" || !topic || !team || await transaction.teamMember.count({ where: { teamId: team.id } }) >= topic.capacity) return false;
      await transaction.recruitmentPost.create({ data: { id: randomUUID(), ...input, status: "OPEN" } });
      return true;
    });
  }

  apply(input: { postId: string; studentId: string; message: string; skills: string[]; desiredRole: string; availability: string; appliedAt: Date }): Promise<"CREATED" | "UNAVAILABLE" | "ALREADY_APPLIED" | "ALREADY_ASSIGNED"> {
    return this.client.$transaction(async (transaction) => {
      const initial = await transaction.recruitmentPost.findUnique({
        where: { id: input.postId },
        select: { teamId: true, team: { select: { topicId: true } } },
      });
      if (!initial) return "UNAVAILABLE";
      const programs = await transaction.$queryRaw<Array<{ status: "DRAFT" | "OPEN" | "CLOSED" }>>(Prisma.sql`
        SELECT "project_program"."status"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${initial.team.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<Array<{ id: string; academicCycleId: string; capacity: number }>>(Prisma.sql`
        SELECT "id", "academicCycleId", "capacity" FROM "topic"
        WHERE "id" = ${initial.team.topicId} AND "status" = 'PUBLISHED'
          AND "recruitmentStartsAt" <= ${input.appliedAt} AND "recruitmentEndsAt" > ${input.appliedAt}
        FOR UPDATE
      `);
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "team" WHERE "id" = ${initial.teamId} AND "status" = 'FORMING' FOR UPDATE
      `);
      const posts = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "recruitment_post" WHERE "id" = ${input.postId} AND "status" = 'OPEN' FOR UPDATE
      `);
      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "user" WHERE "id" = ${input.studentId} FOR UPDATE`);
      const topic = topics[0];
      const team = teams[0];
      const post = posts[0];
      const target = topic && team && post ? { postId: post.id, teamId: team.id, topicId: topic.id, academicCycleId: topic.academicCycleId, capacity: topic.capacity } : null;
      if (programs[0]?.status !== "OPEN") return "UNAVAILABLE";
      if (!target || await transaction.teamMember.count({ where: { teamId: target.teamId } }) >= target.capacity) return "UNAVAILABLE";
      const membership = await transaction.teamMember.findUnique({ where: { academicCycleId_studentId: { academicCycleId: target.academicCycleId, studentId: input.studentId } }, select: { id: true } });
      if (membership) return "ALREADY_ASSIGNED";
      if (await transaction.recruitmentApplication.findUnique({ where: { postId_studentId: { postId: input.postId, studentId: input.studentId } }, select: { id: true } })) return "ALREADY_APPLIED";
      const existing = await transaction.topicApplication.findUnique({ where: { topicId_studentId: { topicId: target.topicId, studentId: input.studentId } }, select: { id: true } });
      if (existing) return "ALREADY_APPLIED";
      const topicApplicationId = randomUUID();
      await transaction.topicApplication.create({ data: { id: topicApplicationId, topicId: target.topicId, studentId: input.studentId, message: input.message, skills: input.skills, desiredRole: input.desiredRole, availability: input.availability, createdAt: input.appliedAt, updatedAt: input.appliedAt } });
      await transaction.recruitmentApplication.create({ data: { id: randomUUID(), postId: input.postId, topicApplicationId, studentId: input.studentId, createdAt: input.appliedAt, updatedAt: input.appliedAt } });
      return "CREATED";
    });
  }

  async findDecisionTarget(id: string, viewer: RecruitmentReviewer): Promise<string | null> {
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
