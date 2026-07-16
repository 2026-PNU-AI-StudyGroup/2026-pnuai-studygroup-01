import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { RecruitmentListResult, RecruitmentPostView, RecruitmentRepository } from "@/modules/recruitment/application/manage-recruitment";

export class PrismaRecruitmentRepository implements RecruitmentRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(actorId: string, requestedPage: number, requestedHistoryPage: number): Promise<RecruitmentListResult> {
    const now = new Date();
    const visible: Prisma.RecruitmentPostWhereInput = { status: "OPEN", team: { status: "FORMING" }, OR: [
      { authorId: actorId, team: { topic: { status: "PUBLISHED" } } },
      { team: { topic: { status: "PUBLISHED", recruitmentStartsAt: { lte: now }, recruitmentEndsAt: { gt: now } } } },
    ] };
    const total = await this.client.recruitmentPost.count({ where: visible });
    const totalPages = Math.max(1, Math.ceil(total / 20));
    const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, totalPages);
    const historyTotal = await this.client.recruitmentApplication.count({ where: { studentId: actorId } });
    const historyTotalPages = Math.max(1, Math.ceil(historyTotal / 20));
    const historyPage = Math.min(Number.isSafeInteger(requestedHistoryPage) && requestedHistoryPage > 0 ? requestedHistoryPage : 1, historyTotalPages);
    const [posts, formingTeams, applicationHistory] = await Promise.all([
      this.client.recruitmentPost.findMany({
        where: visible, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 20,
        include: {
          author: { select: { name: true } },
          team: { select: { name: true, topic: { select: { title: true, capacity: true, status: true, recruitmentStartsAt: true, recruitmentEndsAt: true } }, _count: { select: { members: true } } } },
          applications: { where: { studentId: actorId }, select: { status: true } },
        },
      }),
      this.client.team.findMany({
        where: { status: "FORMING", members: { some: { studentId: actorId } }, topic: { status: "PUBLISHED", recruitmentStartsAt: { lte: now }, recruitmentEndsAt: { gt: now } } },
        select: { id: true, name: true, topic: { select: { capacity: true } }, _count: { select: { members: true } } }, orderBy: { name: "asc" },
      }),
      this.client.recruitmentApplication.findMany({
        where: { studentId: actorId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (historyPage - 1) * 20,
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
      }),
    ]);
    const visiblePostIds = posts.filter(({ authorId }) => authorId === actorId).map(({ id }) => id);
    const visibleReceived = visiblePostIds.length ? await this.client.recruitmentApplication.findMany({
      where: { postId: { in: visiblePostIds } }, orderBy: { createdAt: "asc" },
      include: { student: { select: { name: true } }, topicApplication: { select: { message: true, skills: true, desiredRole: true, availability: true } } },
    }) : [];
    const receivedByPost = new Map<string, RecruitmentPostView["receivedApplications"]>();
    for (const application of visibleReceived) {
      const items = receivedByPost.get(application.postId) ?? [];
      items.push({ id: application.id, studentName: application.student.name, status: application.status, ...application.topicApplication });
      receivedByPost.set(application.postId, items);
    }
    return {
      formingTeams: formingTeams.filter((team) => team._count.members < team.topic.capacity).map(({ id, name }) => ({ id, name })), page, totalPages, total,
      applicationHistory: applicationHistory.map(({ post, ...application }) => ({
        ...application,
        postTitle: post.title,
        teamName: post.team.name,
        topicTitle: post.team.topic.title,
        recruiterName: post.author.name,
      })),
      historyPage,
      historyTotalPages,
      historyTotal,
      posts: posts.map((post) => ({
        id: post.id, teamId: post.teamId, teamName: post.team.name, topicTitle: post.team.topic.title,
        authorId: post.authorId, authorName: post.author.name, title: post.title, content: post.content,
        requiredSkills: post.requiredSkills, roleNeeded: post.roleNeeded, availability: post.availability,
        memberCount: post.team._count.members, capacity: post.team.topic.capacity, createdAt: post.createdAt,
        canApply: post.team.topic.status === "PUBLISHED" && post.team.topic.recruitmentStartsAt <= now && post.team.topic.recruitmentEndsAt > now,
        ownApplication: post.applications[0] ?? null,
        receivedApplications: receivedByPost.get(post.id) ?? [],
      })),
    };
  }

  createPost(input: { teamId: string; authorId: string; title: string; content: string; requiredSkills: string[]; roleNeeded: string; availability: string }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const now = new Date();
      const teams = await transaction.$queryRaw<Array<{ id: string; capacity: number }>>(Prisma.sql`
        SELECT "team"."id", "topic"."capacity"
        FROM "team" JOIN "topic" ON "topic"."id" = "team"."topicId"
        JOIN "team_member" AS "actor_member" ON "actor_member"."teamId" = "team"."id" AND "actor_member"."studentId" = ${input.authorId}
        WHERE "team"."id" = ${input.teamId} AND "team"."status" = 'FORMING'
          AND "topic"."status" = 'PUBLISHED'
          AND "topic"."recruitmentStartsAt" <= ${now}
          AND "topic"."recruitmentEndsAt" > ${now}
        FOR UPDATE OF "team", "topic"
      `);
      const team = teams[0];
      if (!team || await transaction.teamMember.count({ where: { teamId: team.id } }) >= team.capacity) return false;
      await transaction.recruitmentPost.create({ data: { id: randomUUID(), ...input, status: "OPEN" } });
      return true;
    });
  }

  apply(input: { postId: string; studentId: string; message: string; skills: string[]; desiredRole: string; availability: string; appliedAt: Date }): Promise<"CREATED" | "UNAVAILABLE" | "ALREADY_APPLIED" | "ALREADY_ASSIGNED"> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ postId: string; teamId: string; topicId: string; academicCycleId: string; capacity: number }>>(Prisma.sql`
        SELECT "recruitment_post"."id" AS "postId", "team"."id" AS "teamId", "team"."topicId", "team"."academicCycleId", "topic"."capacity"
        FROM "recruitment_post" JOIN "team" ON "team"."id" = "recruitment_post"."teamId"
        JOIN "topic" ON "topic"."id" = "team"."topicId" JOIN "user" ON "user"."id" = ${input.studentId}
        WHERE "recruitment_post"."id" = ${input.postId} AND "recruitment_post"."status" = 'OPEN'
          AND "team"."status" = 'FORMING' AND "topic"."status" = 'PUBLISHED'
          AND "topic"."recruitmentStartsAt" <= ${input.appliedAt} AND "topic"."recruitmentEndsAt" > ${input.appliedAt}
        FOR UPDATE OF "recruitment_post", "team", "topic"
      `);
      const target = rows[0];
      if (!target || await transaction.teamMember.count({ where: { teamId: target.teamId } }) >= target.capacity) return "UNAVAILABLE";
      const membership = await transaction.teamMember.findUnique({ where: { academicCycleId_studentId: { academicCycleId: target.academicCycleId, studentId: input.studentId } }, select: { id: true } });
      if (membership) return "ALREADY_ASSIGNED";
      if (await transaction.recruitmentApplication.findUnique({ where: { postId_studentId: { postId: input.postId, studentId: input.studentId } }, select: { id: true } })) return "ALREADY_APPLIED";
      const existing = await transaction.topicApplication.findUnique({ where: { topicId_studentId: { topicId: target.topicId, studentId: input.studentId } }, include: { recruitmentApplication: { select: { id: true } } } });
      if (existing && (existing.status !== "PENDING" || existing.recruitmentApplication)) return "ALREADY_APPLIED";
      const topicApplicationId = existing?.id ?? randomUUID();
      if (existing) {
        await transaction.topicApplication.update({ where: { id: existing.id }, data: { message: input.message, skills: input.skills, desiredRole: input.desiredRole, availability: input.availability } });
      } else {
        await transaction.topicApplication.create({ data: { id: topicApplicationId, topicId: target.topicId, studentId: input.studentId, message: input.message, skills: input.skills, desiredRole: input.desiredRole, availability: input.availability, createdAt: input.appliedAt, updatedAt: input.appliedAt } });
      }
      await transaction.recruitmentApplication.create({ data: { id: randomUUID(), postId: input.postId, topicApplicationId, studentId: input.studentId, createdAt: input.appliedAt, updatedAt: input.appliedAt } });
      return "CREATED";
    });
  }

  async findDecisionTarget(id: string, authorId: string): Promise<string | null> {
    const application = await this.client.recruitmentApplication.findFirst({
      where: { id, status: "PENDING", post: { authorId, status: "OPEN", team: { status: "FORMING", topic: { status: "PUBLISHED" } } } }, select: { topicApplicationId: true },
    });
    return application?.topicApplicationId ?? null;
  }
}
