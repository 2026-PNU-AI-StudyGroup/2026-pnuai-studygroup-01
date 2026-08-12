import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { StudentTeamWriter } from "@/modules/student-team/application/student-team-ports";

export class PrismaStudentTeamCommandRepository implements StudentTeamWriter {
  constructor(private readonly client: PrismaClient) {}

  create(input: {
    leaderId: string;
    name: string;
    description: string;
    createdAt: Date;
  }): Promise<string> {
    const id = randomUUID();
    return this.client.$transaction(async (transaction) => {
      const user = await transaction.user.findFirst({
        where: { id: input.leaderId, role: "STUDENT", isActive: true },
        select: { id: true },
      });
      if (!user) throw new Error("ACTIVE_STUDENT_REQUIRED");
      await transaction.studentTeam.create({
        data: {
          id,
          name: input.name,
          description: input.description,
          leaderId: input.leaderId,
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
          members: {
            create: {
              id: randomUUID(),
              studentId: input.leaderId,
              role: "LEADER",
              joinedAt: input.createdAt,
            },
          },
        },
      });
      return id;
    });
  }

  invite(input: {
    teamId: string;
    leaderId: string;
    email: string;
    invitedAt: Date;
  }): Promise<"INVITED" | "NOT_FOUND" | "FORBIDDEN" | "ALREADY_MEMBER"> {
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{
        id: string;
        leaderId: string;
      }>>(Prisma.sql`
        SELECT "id", "leaderId" FROM "student_team"
        WHERE "id" = ${input.teamId} AND "deletedAt" IS NULL
        FOR UPDATE
      `);
      const team = teams[0];
      if (!team) return "NOT_FOUND";
      if (team.leaderId !== input.leaderId) return "FORBIDDEN";
      const invitee = await transaction.user.findUnique({
        where: { email: input.email },
        select: { id: true, isActive: true, role: true },
      });
      if (
        invitee &&
        await transaction.studentTeamMember.findUnique({
          where: {
            teamId_studentId: {
              teamId: input.teamId,
              studentId: invitee.id,
            },
          },
          select: { id: true },
        })
      ) {
        return "ALREADY_MEMBER";
      }
      const invitation = await transaction.studentTeamInvitation.upsert({
        where: { teamId_email: { teamId: input.teamId, email: input.email } },
        create: {
          id: randomUUID(),
          teamId: input.teamId,
          email: input.email,
          inviteeId: invitee?.id,
          invitedById: input.leaderId,
          status: "PENDING",
          createdAt: input.invitedAt,
          updatedAt: input.invitedAt,
        },
        update: {
          inviteeId: invitee?.id,
          invitedById: input.leaderId,
          status: "PENDING",
          respondedAt: null,
          createdAt: input.invitedAt,
          updatedAt: input.invitedAt,
        },
        select: { id: true },
      });
      if (invitee?.isActive && invitee.role === "STUDENT") {
        const dedupeKey =
          `student-team-invitation:${invitation.id}:${input.invitedAt.getTime()}`;
        await transaction.notification.upsert({
          where: { dedupeKey },
          create: {
            recipientId: invitee.id,
            type: "SYSTEM",
            title: "새 팀 초대가 도착했습니다",
            body: "팀 관리에서 초대를 확인하고 참여 여부를 선택해 주세요.",
            href: "/teams",
            dedupeKey,
            createdAt: input.invitedAt,
          },
          update: {},
        });
      }
      return "INVITED";
    });
  }

  respond(input: {
    invitationId: string;
    studentId: string;
    email: string;
    decision: "ACCEPT" | "DECLINE";
    respondedAt: Date;
  }): Promise<"ACCEPTED" | "DECLINED" | "NOT_FOUND" | "CONFLICT"> {
    return this.client.$transaction(async (transaction) => {
      const invitations = await transaction.$queryRaw<Array<{
        id: string;
        teamId: string;
        email: string;
        status: string;
      }>>(Prisma.sql`
        SELECT "student_team_invitation"."id", "teamId", "email", "status"
        FROM "student_team_invitation"
        JOIN "student_team" ON "student_team"."id" = "student_team_invitation"."teamId"
        WHERE "student_team_invitation"."id" = ${input.invitationId}
          AND "student_team"."deletedAt" IS NULL
        FOR UPDATE OF "student_team_invitation", "student_team"
      `);
      const invitation = invitations[0];
      if (!invitation || invitation.email !== input.email) return "NOT_FOUND";
      if (invitation.status !== "PENDING") return "CONFLICT";
      if (input.decision === "DECLINE") {
        await transaction.studentTeamInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "DECLINED",
            inviteeId: input.studentId,
            respondedAt: input.respondedAt,
            updatedAt: input.respondedAt,
          },
        });
        return "DECLINED";
      }
      const student = await transaction.user.findFirst({
        where: {
          id: input.studentId,
          email: input.email,
          role: "STUDENT",
          isActive: true,
        },
        select: { id: true },
      });
      if (!student) return "NOT_FOUND";
      await transaction.studentTeamMember.upsert({
        where: {
          teamId_studentId: {
            teamId: invitation.teamId,
            studentId: input.studentId,
          },
        },
        create: {
          id: randomUUID(),
          teamId: invitation.teamId,
          studentId: input.studentId,
          role: "MEMBER",
          joinedAt: input.respondedAt,
        },
        update: {},
      });
      await transaction.studentTeamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          inviteeId: input.studentId,
          respondedAt: input.respondedAt,
          updatedAt: input.respondedAt,
        },
      });
      await transaction.studentTeam.update({
        where: { id: invitation.teamId },
        data: { compositionVersion: { increment: 1 }, updatedAt: input.respondedAt },
      });
      // 초대 수락으로 정원이 찬 모집 공고를 닫는다. 대기 지원은 모집 종료로
      // 조회해 실제 거절과 자동 종료를 구분한다.
      const memberCount = await transaction.studentTeamMember.count({
        where: { teamId: invitation.teamId },
      });
      const filledPosts = await transaction.studentTeamRecruitmentPost.findMany({
        where: { teamId: invitation.teamId, status: "OPEN", capacity: { lte: memberCount } },
        select: { id: true },
      });
      if (filledPosts.length) {
        const filledPostIds = filledPosts.map(({ id }) => id);
        await transaction.studentTeamRecruitmentPost.updateMany({
          where: { id: { in: filledPostIds } },
          data: { status: "CLOSED" },
        });
      }
      return "ACCEPTED";
    });
  }

  transferLeadership(input: {
    teamId: string;
    leaderId: string;
    nextLeaderId: string;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "student_team"
        WHERE "id" = ${input.teamId}
          AND "leaderId" = ${input.leaderId}
          AND "deletedAt" IS NULL
        FOR UPDATE
      `);
      const team = teams[0];
      if (!team) return false;
      const next = await transaction.studentTeamMember.findUnique({
        where: {
          teamId_studentId: {
            teamId: input.teamId,
            studentId: input.nextLeaderId,
          },
        },
        select: { id: true },
      });
      if (!next || input.leaderId === input.nextLeaderId) return false;
      await transaction.studentTeamMember.updateMany({
        where: { teamId: input.teamId, studentId: input.leaderId },
        data: { role: "MEMBER" },
      });
      await transaction.studentTeamMember.update({
        where: { id: next.id },
        data: { role: "LEADER" },
      });
      await transaction.studentTeam.update({
        where: { id: input.teamId },
        data: { leaderId: input.nextLeaderId, compositionVersion: { increment: 1 } },
      });
      return true;
    });
  }

  removeMember(input: {
    teamId: string;
    leaderId: string;
    studentId: string;
  }): Promise<boolean> {
    if (input.leaderId === input.studentId) return Promise.resolve(false);
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id"
        FROM "student_team"
        WHERE "id" = ${input.teamId}
          AND "leaderId" = ${input.leaderId}
          AND "deletedAt" IS NULL
        FOR UPDATE
      `);
      if (!teams[0]) return false;
      const result = await transaction.studentTeamMember.deleteMany({
        where: {
          teamId: input.teamId,
          studentId: input.studentId,
        },
      });
      if (result.count === 1) {
        await transaction.studentTeam.update({
          where: { id: input.teamId },
          data: { compositionVersion: { increment: 1 } },
        });
      }
      return result.count === 1;
    });
  }

  delete(input: {
    teamId: string;
    leaderId: string;
    deletedAt: Date;
  }): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const result = await transaction.studentTeam.updateMany({
        where: {
          id: input.teamId,
          leaderId: input.leaderId,
          deletedAt: null,
        },
        data: { deletedAt: input.deletedAt },
      });
      if (result.count !== 1) return false;
      await transaction.studentTeamInvitation.updateMany({
        where: { teamId: input.teamId, status: "PENDING" },
        data: { status: "CANCELED", respondedAt: input.deletedAt },
      });
      await transaction.studentTeamRecruitmentPost.updateMany({
        where: { teamId: input.teamId, status: "OPEN" },
        data: { status: "CLOSED" },
      });
      await transaction.studentTeamRecruitmentApplication.updateMany({
        where: {
          post: { teamId: input.teamId },
          status: "PENDING",
        },
        data: { status: "REJECTED", decidedAt: input.deletedAt },
      });
      await transaction.topicApprovalRequest.updateMany({
        where: { studentTeamId: input.teamId, status: "PENDING" },
        data: {
          status: "REJECTED",
          reviewComment: "팀 삭제로 승인 요청이 자동 종료되었습니다.",
          decidedAt: input.deletedAt,
        },
      });
      await transaction.topic.updateMany({
        where: {
          approvalRequest: { studentTeamId: input.teamId, status: "REJECTED" },
          status: "PENDING_APPROVAL",
        },
        data: { status: "REJECTED" },
      });
      return true;
    });
  }
}
