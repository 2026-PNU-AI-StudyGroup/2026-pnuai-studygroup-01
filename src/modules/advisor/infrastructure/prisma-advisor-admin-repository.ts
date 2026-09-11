import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { AdvisorAdminRepository, AdvisorInvitationTarget } from "@/modules/advisor/application/manage-advisors";
import { normalizeEmail } from "@/modules/identity/domain/user-role";

type Transaction = Prisma.TransactionClient;

export class PrismaAdvisorAdminRepository implements AdvisorAdminRepository {
  constructor(private readonly client: PrismaClient) {}

  // 이메일 하나에 계정 하나. 이미 있는 ADVISOR면 그 계정으로 이 프로그램 초대만 새로 만든다.
  async inviteAdvisor(input: { programId: string; name: string; email: string; actorId: string }) {
    const email = normalizeEmail(input.email);
    try {
      return await this.client.$transaction(async (transaction) => {
        const existing = await transaction.user.findUnique({
          where: { email },
          select: { id: true, role: true, accountStatus: true },
        });
        if (existing && existing.role !== "ADVISOR") return { status: "EMAIL_TAKEN" as const };
        // 운영자가 사용자 관리에서 직접 잠근 계정은 초대로 풀지 않는다.
        //
        // 회수와 정리 마이그레이션은 살아 있는 초대가 0일 때만 계정을 내린다. 그래서 "살아
        // 있는 초대가 있는데 비활성" 은 setActive 로만 만들어진다 -- 이 조건이 수동 차단의
        // 표지다. 그대로 되살리면 그 위원이 이미 들고 있던 다른 프로그램 링크와 팀 배정까지
        // 함께 열린다. setActive 는 세션만 지우고 토큰은 회수하지 않기 때문이다. 잠근 운영자는
        // 통보를 받지 못하고, 초대하는 운영자는 계정이 잠겨 있었다는 사실조차 보지 못한다.
        //
        // 링크 재발급을 같은 이유로 거절하고 있으므로 초대도 같은 자리로 안내한다.
        if (existing?.accountStatus === "DISABLED") {
          const liveInvitations = await transaction.programAdvisorInvitation.count({
            where: { userId: existing.id, revokedAt: null },
          });
          if (liveInvitations > 0) return { status: "ACCOUNT_DISABLED" as const };
        }
        const userId = existing
          ? existing.id
          : await this.createAdvisorUser(transaction, { email, name: input.name, actorId: input.actorId });
        const invitation = await this.reviveOrCreateInvitation(transaction, {
          programId: input.programId,
          userId,
          actorId: input.actorId,
        });
        if (!invitation) return { status: "ALREADY_INVITED" as const };
        // 여기까지 온 비활성 계정은 살아 있는 초대가 없다. 회수가 내려 둔 상태이므로 다시
        // 부를 때 되살린다. 그러지 않으면 새 링크가 발급되어도 토큰 로그인이 accountStatus
        // 검사에서 막혀 위원에게는 "만료되었거나 회수되었습니다" 만 보인다. 운영자 화면에는
        // 오류가 없어서 재발급을 반복하게 되는, 원인이 드러나지 않는 고리가 된다.
        //
        // 되살려도 예전 링크가 함께 열리지는 않는다. 초대가 모두 회수돼 있어 토큰 로그인이
        // invitation.revokedAt 검사에서 먼저 걸린다. 탈퇴 계정은 그대로 둔다.
        if (existing?.accountStatus === "DISABLED") {
          await transaction.user.updateMany({
            where: { id: userId, role: "ADVISOR", accountStatus: "DISABLED" },
            data: { accountStatus: "ACTIVE" },
          });
        }
        return { status: "INVITED" as const, userId, invitationId: invitation.id, reusedAccount: Boolean(existing) };
      });
    } catch (error) {
      // 동시 초대 레이스: email 또는 (programId, userId) 유니크 충돌.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const raced = await this.client.user.findUnique({ where: { email }, select: { role: true } });
        return raced?.role === "ADVISOR" ? { status: "ALREADY_INVITED" as const } : { status: "EMAIL_TAKEN" as const };
      }
      throw error;
    }
  }

  private async createAdvisorUser(transaction: Transaction, input: { email: string; name: string; actorId: string }) {
    const user = await transaction.user.create({
      data: {
        id: randomUUID(),
        email: input.email,
        name: input.name.trim(),
        role: "ADVISOR",
        emailVerified: false,
        accountStatus: "ACTIVE",
        onboardingRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    await transaction.auditLog.create({ data: {
      actorId: input.actorId,
      action: "ADVISOR_REGISTERED",
      targetType: "ADVISOR",
      targetId: user.id,
      metadata: { email: input.email },
    } });
    return user.id;
  }

  // 거둬 둔 초대가 있으면 그 행을 되살린다. 새로 만들면 (programId, userId) 유니크에 걸린다.
  private async reviveOrCreateInvitation(transaction: Transaction, input: { programId: string; userId: string; actorId: string }) {
    const existing = await transaction.programAdvisorInvitation.findUnique({
      where: { programId_userId: { programId: input.programId, userId: input.userId } },
      select: { id: true, revokedAt: true },
    });
    if (existing && existing.revokedAt === null) return null;
    if (existing) {
      return transaction.programAdvisorInvitation.update({
        where: { id: existing.id },
        data: { revokedAt: null, invitedById: input.actorId, createdAt: new Date() },
        select: { id: true },
      });
    }
    return transaction.programAdvisorInvitation.create({
      data: { id: randomUUID(), programId: input.programId, userId: input.userId, invitedById: input.actorId },
      select: { id: true },
    });
  }

  /**
   * 거둔 초대를 그 자리에서 다시 세운다.
   *
   * 되살리는 길이 초대 폼에 이름과 이메일을 다시 적는 것뿐이었다. 거둔 위원은 화면에서
   * 사라져 있어 운영자는 그 길이 있는지도 몰랐다. 목록에 남은 행에서 바로 부를 수 있게 한다.
   *
   * 팀 배정은 되살리지 않는다. 회수가 지운 것이고, 파일 접근과 채점 화면이 초대가 아니라
   * 팀 배정만 보기 때문이다. 다시 배정하는 것은 운영자가 고를 일이다.
   */
  async reinviteAdvisor(input: { programId: string; userId: string; actorId: string }) {
    const { programId, userId } = input;
    return this.client.$transaction(async (transaction) => {
      const invitation = await transaction.programAdvisorInvitation.findUnique({
        where: { programId_userId: { programId, userId } },
        select: { id: true, revokedAt: true, user: { select: { role: true, accountStatus: true } } },
      });
      if (!invitation || invitation.user.role !== "ADVISOR") return { status: "NOT_FOUND" as const };
      if (invitation.revokedAt === null) return { status: "ALREADY_INVITED" as const };
      // inviteAdvisor 와 같은 기준이다. 살아 있는 초대가 있는데 비활성이면 운영자가 사용자
      // 관리에서 직접 잠근 계정이므로 초대로 풀지 않는다.
      if (invitation.user.accountStatus === "DISABLED") {
        const liveInvitations = await transaction.programAdvisorInvitation.count({
          where: { userId, revokedAt: null },
        });
        if (liveInvitations > 0) return { status: "ACCOUNT_DISABLED" as const };
      }
      if (invitation.user.accountStatus === "WITHDRAWN") return { status: "ACCOUNT_DISABLED" as const };
      await transaction.programAdvisorInvitation.update({
        where: { id: invitation.id },
        data: { revokedAt: null, invitedById: input.actorId, createdAt: new Date() },
      });
      if (invitation.user.accountStatus === "DISABLED") {
        await transaction.user.updateMany({
          where: { id: userId, role: "ADVISOR", accountStatus: "DISABLED" },
          data: { accountStatus: "ACTIVE" },
        });
      }
      // 감사 기록은 뒤따르는 링크 발급(ADVISOR_TOKEN_ISSUED)이 남긴다. 이메일 폼으로 다시
      // 부를 때도 기존 계정이면 등록 기록 없이 발급 기록만 남으므로 같은 자리에 맞춘다.
      return { status: "INVITED" as const, invitationId: invitation.id };
    });
  }

  async findActiveInvitation(target: AdvisorInvitationTarget) {
    const invitation = await this.client.programAdvisorInvitation.findFirst({
      where: { programId: target.programId, userId: target.userId, revokedAt: null },
      select: { id: true, user: { select: { accountStatus: true } } },
    });
    return invitation ? { id: invitation.id, accountStatus: invitation.user.accountStatus } : null;
  }

  async issueToken(input: { invitationId: string; tokenHash: string; expiresAt: Date; actorId: string; target: AdvisorInvitationTarget }) {
    await this.client.$transaction([
      this.client.advisorAccessToken.create({
        data: { id: randomUUID(), invitationId: input.invitationId, tokenHash: input.tokenHash, expiresAt: input.expiresAt },
      }),
      this.client.auditLog.create({ data: {
        actorId: input.actorId,
        action: "ADVISOR_TOKEN_ISSUED",
        targetType: "ADVISOR",
        targetId: input.target.userId,
        metadata: { programId: input.target.programId, expiresAt: input.expiresAt.toISOString() },
      } }),
    ]);
    return true;
  }

  // 재발급 앞단계. 초대는 살려 두고 링크만 죽인다.
  //
  // 링크 회수 = 접근 차단이어야 하므로 세션도 함께 끊는다(기존 동작 유지). 링크가 새어 나가
  // 재발급하는 경우가 있고, 그때 예전 세션이 살아 있으면 회수가 회수가 아니게 된다. 세션은
  // 프로그램별로 나뉘지 않으므로 다른 프로그램을 함께 심사하던 위원도 같이 나가게 된다 —
  // 재발급은 드물고 새 링크로 곧장 다시 들어오므로 이쪽 손해를 택한다.
  async revokeTokens(input: { invitationId: string; revokedAt: Date; actorId: string; target: AdvisorInvitationTarget }) {
    const { programId, userId } = input.target;
    await this.client.$transaction([
      this.client.advisorAccessToken.updateMany({
        where: { invitationId: input.invitationId, revokedAt: null },
        data: { revokedAt: input.revokedAt },
      }),
      this.client.session.deleteMany({ where: { userId, user: { role: "ADVISOR" } } }),
      this.client.auditLog.create({ data: {
        actorId: input.actorId,
        action: "ADVISOR_TOKEN_REVOKED",
        targetType: "ADVISOR",
        targetId: userId,
        metadata: { programId },
        createdAt: input.revokedAt,
      } }),
    ]);
    return true;
  }

  async revokeInvitation(input: { revokedAt: Date; actorId: string; target: AdvisorInvitationTarget }) {
    const { programId, userId } = input.target;
    return this.client.$transaction(async (transaction) => {
      const invitation = await transaction.programAdvisorInvitation.findFirst({
        where: { programId, userId, revokedAt: null },
        select: { id: true },
      });
      if (!invitation) return false;
      await transaction.programAdvisorInvitation.update({
        where: { id: invitation.id },
        data: { revokedAt: input.revokedAt },
      });
      await transaction.advisorAccessToken.updateMany({
        where: { invitationId: invitation.id, revokedAt: null },
        data: { revokedAt: input.revokedAt },
      });
      // 팀 배정이 남으면 회수한 위원에게 제출물과 채점 화면이 그대로 열린다.
      await transaction.projectAdvisor.deleteMany({ where: { userId, topic: { programId } } });
      // 다른 프로그램 초대가 남아 있으면 세션은 살려 둔다. 한쪽을 거뒀다고 그 위원이 다른
      // 프로그램 심사 도중에 튕겨 나갈 이유는 없다.
      const remaining = await transaction.programAdvisorInvitation.count({ where: { userId, revokedAt: null } });
      if (remaining === 0) {
        await transaction.session.deleteMany({ where: { userId, user: { role: "ADVISOR" } } });
        // 초대가 하나도 남지 않은 위원은 들어올 길이 없다. 링크도 세션도 끊겼고 자문위원은
        // 구글 로그인을 쓸 수 없다. 그런데 계정만 활성으로 남아 사용자 목록은 "아직 접속할
        // 수 있는 사람" 으로 보여 주었다. 실제와 목록을 맞춘다.
        //
        // 탈퇴한 계정은 건드리지 않는다. 탈퇴는 비활성화보다 무거운 상태라 되돌려선 안 된다.
        await transaction.user.updateMany({
          where: { id: userId, role: "ADVISOR", accountStatus: "ACTIVE" },
          data: { accountStatus: "DISABLED" },
        });
      }
      await transaction.auditLog.create({ data: {
        actorId: input.actorId,
        action: "ADVISOR_TOKEN_REVOKED",
        targetType: "ADVISOR",
        targetId: userId,
        metadata: { programId },
        createdAt: input.revokedAt,
      } });
      return true;
    });
  }

  // 전체 교체 방식(프로그램 스코프): 이 프로그램의 topic만 동기화 — 다른 프로그램 할당은 보존.
  async assignTeams(input: { userId: string; programId: string; topicIds: string[]; grantedById: string }) {
    await this.client.$transaction(async (transaction) => {
      await transaction.projectAdvisor.deleteMany({
        where: { userId: input.userId, topic: { programId: input.programId }, topicId: { notIn: input.topicIds } },
      });
      const existing = await transaction.projectAdvisor.findMany({
        where: { userId: input.userId, topic: { programId: input.programId } },
        select: { topicId: true },
      });
      const have = new Set(existing.map((row) => row.topicId));
      const candidates = input.topicIds.filter((topicId) => !have.has(topicId));
      if (candidates.length > 0) {
        // candidates가 실제로 이 programId 소속 topic인지 확인 후에만 생성 — 타 프로그램 topicId 주입 차단.
        const validTopics = await transaction.topic.findMany({
          where: { id: { in: candidates }, programId: input.programId },
          select: { id: true },
        });
        const toAdd = validTopics.map((topic) => topic.id);
        if (toAdd.length > 0) {
          await transaction.projectAdvisor.createMany({
            data: toAdd.map((topicId) => ({
              id: randomUUID(),
              topicId,
              userId: input.userId,
              grantedById: input.grantedById,
            })),
          });
        }
      }
      await transaction.auditLog.create({ data: {
        actorId: input.grantedById,
        action: "ADVISOR_TEAMS_ASSIGNED",
        targetType: "ADVISOR",
        targetId: input.userId,
        metadata: { programId: input.programId, topicIds: input.topicIds },
      } });
    });
    return true;
  }
}
