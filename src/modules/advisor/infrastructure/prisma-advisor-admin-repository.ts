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
        const existing = await transaction.user.findUnique({ where: { email }, select: { id: true, role: true } });
        if (existing && existing.role !== "ADVISOR") return { status: "EMAIL_TAKEN" as const };
        const userId = existing
          ? existing.id
          : await this.createAdvisorUser(transaction, { email, name: input.name, actorId: input.actorId });
        const invitation = await this.reviveOrCreateInvitation(transaction, {
          programId: input.programId,
          userId,
          actorId: input.actorId,
        });
        if (!invitation) return { status: "ALREADY_INVITED" as const };
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

  async findActiveInvitation(target: AdvisorInvitationTarget) {
    return this.client.programAdvisorInvitation.findFirst({
      where: { programId: target.programId, userId: target.userId, revokedAt: null },
      select: { id: true },
    });
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
