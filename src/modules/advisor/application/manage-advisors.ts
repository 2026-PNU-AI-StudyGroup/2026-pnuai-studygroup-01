import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  advisorTokenExpiry,
  generateAdvisorToken,
} from "@/modules/advisor/domain/advisor-access-token";

export class AdvisorOperationError extends Error {}

export interface AdvisorAdminRepository {
  registerAdvisor(input: { name: string; email: string; actorId: string }): Promise<{ userId: string } | null>;
  issueToken(input: { userId: string; tokenHash: string; expiresAt: Date; actorId: string }): Promise<boolean>;
  revokeTokens(input: { userId: string; revokedAt: Date; actorId: string }): Promise<boolean>;
  assignTeams(input: { userId: string; programId: string; topicIds: string[]; grantedById: string }): Promise<boolean>;
}

export class AdvisorAdminService {
  constructor(private readonly repository: AdvisorAdminRepository) {}

  private assertAdmin(actor: CurrentActor) {
    if (actor.role !== "ADMIN") throw new AdvisorOperationError("관리자만 자문위원을 관리할 수 있습니다.");
  }

  async register(actor: CurrentActor, input: { name: string; email: string }) {
    this.assertAdmin(actor);
    const advisor = await this.repository.registerAdvisor({ ...input, actorId: actor.id });
    if (!advisor) throw new AdvisorOperationError("자문위원 정보를 확인해 주세요.");
    const inviteToken = await this.reissueToken(actor, advisor.userId);
    return { userId: advisor.userId, inviteToken };
  }

  async reissueToken(actor: CurrentActor, userId: string) {
    this.assertAdmin(actor);
    const now = new Date();
    await this.repository.revokeTokens({ userId, revokedAt: now, actorId: actor.id });
    const { token, tokenHash } = generateAdvisorToken();
    const issued = await this.repository.issueToken({ userId, tokenHash, expiresAt: advisorTokenExpiry(now), actorId: actor.id });
    if (!issued) throw new AdvisorOperationError("초대 토큰을 발급하지 못했습니다.");
    return token;
  }

  async revoke(actor: CurrentActor, userId: string) {
    this.assertAdmin(actor);
    await this.repository.revokeTokens({ userId, revokedAt: new Date(), actorId: actor.id });
  }

  async assignTeams(actor: CurrentActor, input: { userId: string; programId: string; topicIds: string[] }) {
    this.assertAdmin(actor);
    const saved = await this.repository.assignTeams({ ...input, grantedById: actor.id });
    if (!saved) throw new AdvisorOperationError("팀 할당을 저장하지 못했습니다.");
  }
}
