import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { OutboxEmailEvent } from "@/modules/email/application/email-delivery-ports";
import type { StudentTeamWriter } from "@/modules/student-team/application/student-team-ports";
import { enqueueEmailEvents } from "@/modules/email/infrastructure/email-events";

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * 사전 팀에서 빠진 사람의 대기 중 팀 지원을 함께 물린다.
 *
 * 지원서는 낸 시점의 팀원 명단을 그대로 들고 있다. 심사 대기 중에 누가 나가도
 * 지원서는 그대로라, 뒤늦게 승인되면 이미 팀에 없는 사람이 프로젝트 구성원으로
 * 들어가고 작업 공간과 파일 권한까지 열린다. 나갈 때 같이 물려야 한다.
 *
 * 이미 승인된 프로젝트 팀은 건드리지 않는다. 화면에서도 그렇게 안내한다.
 */
async function withdrawPendingTeamApplications(
  transaction: TransactionClient,
  input: { teamId: string; studentId: string; changedAt: Date },
): Promise<void> {
  await transaction.topicApplication.updateMany({
    where: {
      studentId: input.studentId,
      status: "PENDING",
      group: { studentTeamId: input.teamId },
    },
    // 철회도 결정이 난 상태라 결정 시각이 있어야 한다. 비워 두면 DB 제약이 막는다.
    data: {
      status: "WITHDRAWN",
      decidedAt: input.changedAt,
      reviewComment: "지원한 팀에서 나가 지원이 철회되었습니다.",
    },
  });
}

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
        where: { id: input.leaderId, role: "STUDENT", accountStatus: "ACTIVE" },
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
        select: { id: true, accountStatus: true, role: true },
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
      if (invitee?.accountStatus === "ACTIVE" && invitee.role === "STUDENT") {
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
      if (!invitee || (invitee.accountStatus === "ACTIVE" && invitee.role === "STUDENT")) {
        const emailEvent: OutboxEmailEvent = invitee
          ? {
              kind: "TEAM_INVITATION",
              recipientId: invitee.id,
              title: "새 팀 초대가 도착했습니다",
              body: "PMS 팀 관리에서 초대를 확인하고 참여 여부를 선택해 주세요.",
              titleEn: "New team invitation",
              bodyEn: "Review the invitation and choose whether to join from Team Management in PMS.",
              href: "/teams",
              idempotencyKey: `email:student-team-invitation:${invitation.id}:${input.invitedAt.getTime()}`,
              createdAt: input.invitedAt,
            }
          : {
              kind: "TEAM_INVITATION",
              recipientEmail: input.email,
              title: "새 팀 초대가 도착했습니다",
              body: "PMS 팀 관리에서 초대를 확인하고 참여 여부를 선택해 주세요.",
              titleEn: "New team invitation",
              bodyEn: "Review the invitation and choose whether to join from Team Management in PMS.",
              href: "/teams",
              idempotencyKey: `email:student-team-invitation:${invitation.id}:${input.invitedAt.getTime()}`,
              createdAt: input.invitedAt,
            };
        await enqueueEmailEvents(transaction, [emailEvent]);
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
          accountStatus: "ACTIVE",
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

  // 팀장이 보낸 초대를 되돌린다. 응답을 기다리는 초대가 남아 있으면 프로젝트 등록이 막힌다.
  async cancelInvitation(input: { invitationId: string; leaderId: string }): Promise<boolean> {
    const { count } = await this.client.studentTeamInvitation.updateMany({
      where: {
        id: input.invitationId,
        status: "PENDING",
        team: { leaderId: input.leaderId, deletedAt: null },
      },
      data: { status: "CANCELED" },
    });
    return count === 1;
  }

  transferLeadership(input: {
    teamId: string;
    leaderId: string;
    nextLeaderId: string;
    changedAt: Date;
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
    changedAt: Date;
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
        await withdrawPendingTeamApplications(transaction, {
          teamId: input.teamId,
          studentId: input.studentId,
          changedAt: input.changedAt,
        });
        await transaction.studentTeam.update({
          where: { id: input.teamId },
          data: { compositionVersion: { increment: 1 } },
        });
      }
      return result.count === 1;
    });
  }

  leave(input: {
    teamId: string;
    studentId: string;
    leftAt: Date;
  }): Promise<"LEFT" | "NOT_FOUND" | "LEADER_TRANSFER_REQUIRED"> {
    return this.client.$transaction(async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{ id: string; leaderId: string }>>(Prisma.sql`
        SELECT "id", "leaderId"
        FROM "student_team"
        WHERE "id" = ${input.teamId} AND "deletedAt" IS NULL
        FOR UPDATE
      `);
      const team = teams[0];
      if (!team) return "NOT_FOUND";
      const membership = await transaction.studentTeamMember.findUnique({
        where: { teamId_studentId: { teamId: input.teamId, studentId: input.studentId } },
        select: { id: true },
      });
      if (!membership) return "NOT_FOUND";
      if (team.leaderId === input.studentId) return "LEADER_TRANSFER_REQUIRED";
      await transaction.studentTeamMember.delete({ where: { id: membership.id } });
      await withdrawPendingTeamApplications(transaction, {
        teamId: input.teamId,
        studentId: input.studentId,
        changedAt: input.leftAt,
      });
      await transaction.studentTeam.update({
        where: { id: input.teamId },
        data: { compositionVersion: { increment: 1 }, updatedAt: input.leftAt },
      });
      return "LEFT";
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
      return true;
    });
  }
}
