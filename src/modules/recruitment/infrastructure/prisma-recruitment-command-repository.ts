import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { RecruitmentWriter } from "@/modules/recruitment/application/manage-recruitment";

export class PrismaRecruitmentCommandRepository implements RecruitmentWriter {
  constructor(private readonly client: PrismaClient) {}

  createPost(input: {
    teamId: string;
    authorId: string;
    title: string;
    content: string;
    requiredSkills: string[];
    roleNeeded: string;
    availability: string;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const now = new Date();
      const initial = await transaction.team.findUnique({
        where: { id: input.teamId },
        select: { topicId: true },
      });
      if (!initial) return false;
      const programs = await transaction.$queryRaw<Array<{
        status: "DRAFT" | "OPEN" | "CLOSED";
      }>>(Prisma.sql`
        SELECT "project_program"."status"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${initial.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<Array<{
        capacity: number;
      }>>(Prisma.sql`
        SELECT "capacity" FROM "topic"
        WHERE "id" = ${initial.topicId} AND "status" = 'PUBLISHED'
          AND "recruitmentStartsAt" <= ${now} AND "recruitmentEndsAt" > ${now}
        FOR UPDATE
      `);
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "team"."id" FROM "team"
        WHERE "team"."id" = ${input.teamId} AND "team"."status" = 'FORMING'
          AND EXISTS (
            SELECT 1 FROM "team_member"
            WHERE "teamId" = "team"."id" AND "studentId" = ${input.authorId}
          )
        FOR UPDATE
      `);
      const team = teams[0];
      const topic = topics[0];
      if (
        programs[0]?.status !== "OPEN" ||
        !topic ||
        !team ||
        await transaction.teamMember.count({
          where: { teamId: team.id },
        }) >= topic.capacity
      ) {
        return false;
      }
      await transaction.recruitmentPost.create({
        data: { id: randomUUID(), ...input, status: "OPEN" },
      });
      return true;
    });
  }

  apply(input: {
    postId: string;
    studentId: string;
    message: string;
    skills: string[];
    desiredRole: string;
    availability: string;
    appliedAt: Date;
  }): Promise<
    "CREATED" | "UNAVAILABLE" | "ALREADY_APPLIED" | "ALREADY_ASSIGNED"
  > {
    return this.client.$transaction(async (transaction) => {
      const initial = await transaction.recruitmentPost.findUnique({
        where: { id: input.postId },
        select: { teamId: true, team: { select: { topicId: true } } },
      });
      if (!initial) return "UNAVAILABLE";
      const programs = await transaction.$queryRaw<Array<{
        status: "DRAFT" | "OPEN" | "CLOSED";
      }>>(Prisma.sql`
        SELECT "project_program"."status"
        FROM "project_program" JOIN "topic" ON "topic"."programId" = "project_program"."id"
        WHERE "topic"."id" = ${initial.team.topicId}
        FOR UPDATE OF "project_program"
      `);
      const topics = await transaction.$queryRaw<Array<{
        id: string;
        academicCycleId: string;
        capacity: number;
      }>>(Prisma.sql`
        SELECT "id", "academicCycleId", "capacity" FROM "topic"
        WHERE "id" = ${initial.team.topicId} AND "status" = 'PUBLISHED'
          AND "recruitmentStartsAt" <= ${input.appliedAt}
          AND "recruitmentEndsAt" > ${input.appliedAt}
        FOR UPDATE
      `);
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "team"
        WHERE "id" = ${initial.teamId} AND "status" = 'FORMING'
        FOR UPDATE
      `);
      const posts = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "recruitment_post"
        WHERE "id" = ${input.postId} AND "status" = 'OPEN'
        FOR UPDATE
      `);
      await transaction.$queryRaw(
        Prisma.sql`SELECT "id" FROM "user" WHERE "id" = ${input.studentId} FOR UPDATE`,
      );
      const topic = topics[0];
      const team = teams[0];
      const post = posts[0];
      if (programs[0]?.status !== "OPEN" || !topic || !team || !post) {
        return "UNAVAILABLE";
      }
      if (
        await transaction.teamMember.count({
          where: { teamId: team.id },
        }) >= topic.capacity
      ) {
        return "UNAVAILABLE";
      }
      const membership = await transaction.teamMember.findUnique({
        where: {
          academicCycleId_studentId: {
            academicCycleId: topic.academicCycleId,
            studentId: input.studentId,
          },
        },
        select: { id: true },
      });
      if (membership) return "ALREADY_ASSIGNED";
      const existingRecruitment =
        await transaction.recruitmentApplication.findUnique({
          where: {
            postId_studentId: {
              postId: input.postId,
              studentId: input.studentId,
            },
          },
          select: { id: true },
        });
      if (existingRecruitment) return "ALREADY_APPLIED";
      const existingTopic = await transaction.topicApplication.findUnique({
        where: {
          topicId_studentId: {
            topicId: topic.id,
            studentId: input.studentId,
          },
        },
        select: { id: true },
      });
      if (existingTopic) return "ALREADY_APPLIED";
      const topicApplicationId = randomUUID();
      await transaction.topicApplication.create({
        data: {
          id: topicApplicationId,
          topicId: topic.id,
          studentId: input.studentId,
          message: input.message,
          skills: input.skills,
          desiredRole: input.desiredRole,
          availability: input.availability,
          createdAt: input.appliedAt,
          updatedAt: input.appliedAt,
        },
      });
      await transaction.recruitmentApplication.create({
        data: {
          id: randomUUID(),
          postId: input.postId,
          topicApplicationId,
          studentId: input.studentId,
          createdAt: input.appliedAt,
          updatedAt: input.appliedAt,
        },
      });
      return "CREATED";
    });
  }
}
