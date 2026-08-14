import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AdvisorAdminRepository } from "@/modules/advisor/application/manage-advisors";
import { normalizeEmail } from "@/modules/identity/domain/user-role";

export class PrismaAdvisorAdminRepository implements AdvisorAdminRepository {
  constructor(private readonly client: PrismaClient) {}

  // 동일 이메일 기존 ADVISOR는 재사용, 타 역할 이메일이면 거부(null).
  async registerAdvisor(input: { name: string; email: string }) {
    const email = normalizeEmail(input.email);
    const existing = await this.client.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (existing) return existing.role === "ADVISOR" ? { userId: existing.id } : null;
    const created = await this.client.user.create({
      data: {
        id: randomUUID(),
        email,
        name: input.name.trim(),
        role: "ADVISOR",
        emailVerified: false,
        isActive: true,
        onboardingRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return { userId: created.id };
  }

  async issueToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    await this.client.advisorAccessToken.create({
      data: { id: randomUUID(), userId: input.userId, tokenHash: input.tokenHash, expiresAt: input.expiresAt },
    });
    return true;
  }

  // 토큰 회수 = 접근 차단이어야 하므로 활성 세션도 함께 종료한다.
  async revokeTokens(input: { userId: string; revokedAt: Date }) {
    await this.client.$transaction([
      this.client.advisorAccessToken.updateMany({
        where: { userId: input.userId, revokedAt: null },
        data: { revokedAt: input.revokedAt },
      }),
      this.client.session.deleteMany({ where: { userId: input.userId } }),
    ]);
    return true;
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
    });
    return true;
  }
}
