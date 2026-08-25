import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { isPusanEmail } from "@/modules/identity/domain/user-role";
import {
  advisorTokenExpiry,
  generateAdvisorToken,
} from "@/modules/advisor/domain/advisor-access-token";

export class AdvisorOperationError extends Error {}

export interface AdvisorAdminRepository {
  registerAdvisor(input: { name: string; email: string; actorId: string }): Promise<{ userId: string; created: boolean } | null>;
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
    // 자문위원은 학교 계정이 없는 외부 심사위원 몫이다. 교내 주소로 만들어 두면 그 주소의
    // 주인이 구글로 로그인할 때 이미 다른 방식으로 만들어진 계정과 부딪혀 들어오지 못한다.
    // 게다가 역할이 자문위원으로 굳어 학생이나 교수로 되돌아가지도 않는다.
    if (isPusanEmail(input.email)) {
      throw new AdvisorOperationError("부산대학교 계정은 자문위원으로 등록할 수 없습니다. 교내 구성원은 구글 로그인으로 접속한 뒤 권한을 지정해 주세요.");
    }
    const advisor = await this.repository.registerAdvisor({ ...input, actorId: actor.id });
    if (!advisor) throw new AdvisorOperationError("자문위원 정보를 확인해 주세요.");
    // 같은 주소로 다시 등록하면 새 초대 링크가 나가면서 예전 링크와 접속이 끊긴다.
    // 채점 중인 위원이 그 순간 튕기고 적던 점수가 날아간다. 등록을 되풀이하지 않는다.
    if (!advisor.created) {
      throw new AdvisorOperationError("이미 등록된 자문위원입니다. 초대 링크가 필요하면 목록에서 다시 발급해 주세요.");
    }
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
