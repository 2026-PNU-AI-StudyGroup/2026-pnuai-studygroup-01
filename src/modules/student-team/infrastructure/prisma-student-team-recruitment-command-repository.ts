import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { StudentTeamRecruitmentWriter } from "@/modules/student-team/application/manage-student-team-recruitment";

export class PrismaStudentTeamRecruitmentCommandRepository
  implements StudentTeamRecruitmentWriter
{
  constructor(private readonly client: PrismaClient) {}

  createPost(input: {
    teamId: string;
    leaderId: string;
    title: string;
    content: string;
    requiredSkills: string[];
    roleNeeded: string;
    availability: string;
    capacity: number;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "student_team" WHERE "id" = ${input.teamId}
          AND "leaderId" = ${input.leaderId} AND "deletedAt" IS NULL FOR UPDATE
      `);
      if (
        !teams[0] ||
        await transaction.studentTeamMember.count({
          where: { teamId: input.teamId },
        }) >= input.capacity
      ) {
        return false;
      }
      await transaction.studentTeamRecruitmentPost.create({
        data: { id: randomUUID(), authorId: input.leaderId, ...input },
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
  }): Promise<"CREATED" | "UNAVAILABLE" | "ALREADY_APPLIED" | "ALREADY_MEMBER"> {
    return this.client.$transaction(async (transaction) => {
      const posts = await transaction.$queryRaw<Array<{
        id: string;
        teamId: string;
        capacity: number;
      }>>(Prisma.sql`
        SELECT "student_team_recruitment_post"."id", "teamId", "capacity"
        FROM "student_team_recruitment_post"
        JOIN "student_team" ON "student_team"."id" = "student_team_recruitment_post"."teamId"
        WHERE "student_team_recruitment_post"."id" = ${input.postId}
          AND "student_team_recruitment_post"."status" = 'OPEN'
          AND "student_team"."deletedAt" IS NULL
        FOR UPDATE OF "student_team_recruitment_post", "student_team"
      `);
      const post = posts[0];
      if (
        !post ||
        await transaction.studentTeamMember.count({
          where: { teamId: post.teamId },
        }) >= post.capacity
      ) {
        return "UNAVAILABLE";
      }
      if (
        await transaction.studentTeamMember.findUnique({
          where: {
            teamId_studentId: {
              teamId: post.teamId,
              studentId: input.studentId,
            },
          },
          select: { id: true },
        })
      ) {
        return "ALREADY_MEMBER";
      }
      if (
        await transaction.studentTeamRecruitmentApplication.findUnique({
          where: {
            postId_studentId: {
              postId: input.postId,
              studentId: input.studentId,
            },
          },
          select: { id: true },
        })
      ) {
        return "ALREADY_APPLIED";
      }
      await transaction.studentTeamRecruitmentApplication.create({
        data: {
          id: randomUUID(),
          ...input,
          updatedAt: input.appliedAt,
        },
      });
      return "CREATED";
    });
  }

  decide(input: {
    applicationId: string;
    actorId: string;
    isAdmin: boolean;
    decision: "ACCEPT" | "REJECT";
    decidedAt: Date;
  }): Promise<"ACCEPTED" | "REJECTED" | "UNAVAILABLE" | "FORBIDDEN"> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{
        id: string;
        studentId: string;
        postId: string;
        teamId: string;
        leaderId: string;
        capacity: number;
        status: string;
      }>>(Prisma.sql`
        SELECT a."id", a."studentId", a."postId", p."teamId", t."leaderId", p."capacity", a."status"
        FROM "student_team_recruitment_application" a
        JOIN "student_team_recruitment_post" p ON p."id" = a."postId"
        JOIN "student_team" t ON t."id" = p."teamId"
        WHERE a."id" = ${input.applicationId} AND t."deletedAt" IS NULL
        FOR UPDATE OF a, p, t
      `);
      const target = rows[0];
      if (!target || target.status !== "PENDING") return "UNAVAILABLE";
      if (!input.isAdmin && target.leaderId !== input.actorId) {
        return "FORBIDDEN";
      }
      if (input.decision === "REJECT") {
        await transaction.studentTeamRecruitmentApplication.update({
          where: { id: target.id },
          data: { status: "REJECTED", decidedAt: input.decidedAt },
        });
        return "REJECTED";
      }
      if (
        await transaction.studentTeamMember.count({
          where: { teamId: target.teamId },
        }) >= target.capacity
      ) {
        return "UNAVAILABLE";
      }
      await transaction.studentTeamMember.upsert({
        where: {
          teamId_studentId: {
            teamId: target.teamId,
            studentId: target.studentId,
          },
        },
        create: {
          id: randomUUID(),
          teamId: target.teamId,
          studentId: target.studentId,
          role: "MEMBER",
          joinedAt: input.decidedAt,
        },
        update: {},
      });
      await transaction.studentTeamRecruitmentApplication.update({
        where: { id: target.id },
        data: { status: "ACCEPTED", decidedAt: input.decidedAt },
      });
      if (
        await transaction.studentTeamMember.count({
          where: { teamId: target.teamId },
        }) >= target.capacity
      ) {
        await transaction.studentTeamRecruitmentPost.update({
          where: { id: target.postId },
          data: { status: "CLOSED" },
        });
        await transaction.studentTeamRecruitmentApplication.updateMany({
          where: { postId: target.postId, status: "PENDING" },
          data: { status: "REJECTED", decidedAt: input.decidedAt },
        });
      }
      return "ACCEPTED";
    });
  }
}
