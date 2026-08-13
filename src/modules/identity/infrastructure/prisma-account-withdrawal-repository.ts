import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { AccountWithdrawalRepository, WithdrawAccountOutcome } from "@/modules/identity/application/withdraw-account";

export class PrismaAccountWithdrawalRepository implements AccountWithdrawalRepository {
  constructor(private readonly client: PrismaClient) {}

  withdraw(userId: string, withdrawnAt: Date): Promise<WithdrawAccountOutcome> {
    return this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(1947337051, 1)::text AS "lock"`);
      const users = await transaction.$queryRaw<Array<{
        id: string;
        role: "STUDENT" | "PROFESSOR" | "ADMIN";
        email: string;
        accountStatus: "ACTIVE" | "DISABLED" | "WITHDRAWN";
      }>>(Prisma.sql`
        SELECT "id", "role", "email", "accountStatus"
        FROM "user"
        WHERE "id" = ${userId}
        FOR UPDATE
      `);
      const user = users[0];
      if (!user) return "NOT_FOUND";
      if (user.accountStatus === "WITHDRAWN") return "ALREADY_WITHDRAWN";

      if (user.role === "ADMIN") {
        const activeAdmins = await transaction.user.count({ where: { role: "ADMIN", accountStatus: "ACTIVE" } });
        if (activeAdmins <= 1) return "LAST_ADMIN";
      }
      if (user.role === "PROFESSOR") {
        const activeProjects = await transaction.topic.count({ where: { managerId: user.id, status: "ACTIVE", program: { endsAt: { gt: withdrawnAt } } } });
        if (activeProjects > 0) return "ACTIVE_PROJECTS";
      }
      if (user.role === "STUDENT") {
        const preTeamLeadership = await transaction.studentTeam.count({ where: { leaderId: user.id, deletedAt: null } });
        if (preTeamLeadership > 0) return "STUDENT_TEAM_LEADER";
        const projectLeadership = await transaction.projectTeamMembership.count({
          where: { userId: user.id, role: "LEADER", endedAt: null, projectTeam: { project: { status: "ACTIVE", program: { endsAt: { gt: withdrawnAt } } } } },
        });
        if (projectLeadership > 0) return "PROJECT_TEAM_LEADER";
      }

      const preTeams = user.role === "STUDENT" ? await transaction.studentTeamMember.findMany({
        where: { studentId: user.id },
        select: { teamId: true },
      }) : [];
      const preTeamIds = [...new Set(preTeams.map(({ teamId }) => teamId))];
      if (preTeamIds.length) {
        await transaction.studentTeamMember.deleteMany({ where: { studentId: user.id, teamId: { in: preTeamIds } } });
        await transaction.studentTeam.updateMany({ where: { id: { in: preTeamIds } }, data: { compositionVersion: { increment: 1 }, updatedAt: withdrawnAt } });
        const pendingProposals = await transaction.topicApprovalRequest.findMany({
          where: { studentTeamId: { in: preTeamIds }, status: "PENDING" },
          select: { id: true, topicId: true },
        });
        if (pendingProposals.length) {
          await transaction.topicApprovalRequest.updateMany({
            where: { id: { in: pendingProposals.map(({ id }) => id) } },
            data: { status: "CANCELED", reviewComment: "팀원 계정 탈퇴로 승인 요청이 취소되었습니다.", decidedAt: withdrawnAt },
          });
          await transaction.topic.updateMany({
            where: { id: { in: pendingProposals.map(({ topicId }) => topicId) }, status: "PENDING_APPROVAL" },
            data: { status: "REJECTED" },
          });
        }
      }

      await transaction.projectTeamMembership.updateMany({
        where: { userId: user.id, endedAt: null, projectTeam: { project: { status: "ACTIVE", program: { endsAt: { gt: withdrawnAt } } } } },
        data: { endedAt: withdrawnAt, endReason: "ACCOUNT_WITHDRAWN" },
      });
      const pendingApplications = await transaction.topicApplication.findMany({
        where: { studentId: user.id, status: "PENDING" },
        select: { id: true, groupId: true },
      });
      const applicationIds = pendingApplications.map(({ id }) => id);
      const groupIds = pendingApplications.flatMap(({ groupId }) => groupId ? [groupId] : []);
      if (applicationIds.length || groupIds.length) {
        const affected = await transaction.topicApplication.findMany({
          where: { status: "PENDING", OR: [{ id: { in: applicationIds } }, { groupId: { in: groupIds } }] },
          select: { id: true },
        });
        const affectedIds = affected.map(({ id }) => id);
        await transaction.topicApplication.updateMany({
          where: { id: { in: affectedIds } },
          data: { status: "WITHDRAWN", decidedAt: withdrawnAt, reviewComment: "구성원 계정 탈퇴로 지원이 철회되었습니다." },
        });
        await transaction.recruitmentApplication.updateMany({
          where: { topicApplicationId: { in: affectedIds }, status: "PENDING" },
          data: { status: "WITHDRAWN", decidedAt: withdrawnAt },
        });
      }
      await transaction.studentTeamRecruitmentApplication.updateMany({
        where: { studentId: user.id, status: "PENDING" },
        data: { status: "WITHDRAWN", decidedAt: withdrawnAt },
      });
      await transaction.studentTeamInvitation.updateMany({
        where: {
          status: "PENDING",
          OR: [{ inviteeId: user.id }, { email: user.email }, { invitedById: user.id }],
        },
        data: { status: "CANCELED", respondedAt: withdrawnAt, updatedAt: withdrawnAt },
      });
      const ownApprovals = await transaction.topicApprovalRequest.findMany({
        where: { requesterId: user.id, status: "PENDING" },
        select: { id: true, topicId: true },
      });
      if (ownApprovals.length) {
        await transaction.topicApprovalRequest.updateMany({
          where: { id: { in: ownApprovals.map(({ id }) => id) } },
          data: { status: "WITHDRAWN", reviewComment: "요청자 계정 탈퇴", decidedAt: withdrawnAt },
        });
        await transaction.topic.updateMany({
          where: { id: { in: ownApprovals.map(({ topicId }) => topicId) }, status: "PENDING_APPROVAL" },
          data: { status: "REJECTED" },
        });
      }

      await transaction.session.deleteMany({ where: { userId: user.id } });
      await transaction.user.update({
        where: { id: user.id },
        data: { accountStatus: "WITHDRAWN", withdrawnAt },
      });
      await transaction.auditLog.create({ data: {
        actorId: user.id,
        action: "USER_WITHDRAWN",
        targetType: "USER",
        targetId: user.id,
        metadata: { previousAccountStatus: user.accountStatus },
        createdAt: withdrawnAt,
      } });
      return "WITHDRAWN";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
