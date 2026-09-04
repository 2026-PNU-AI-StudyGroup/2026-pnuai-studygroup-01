import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { isPusanEmail } from "@/modules/identity/domain/user-role";
import {
  advisorTokenExpiry,
  generateAdvisorToken,
} from "@/modules/advisor/domain/advisor-access-token";

export class AdvisorOperationError extends Error {}

export type AdvisorInvitationTarget = { programId: string; userId: string };

export interface AdvisorAdminRepository {
  /**
   * 이 프로그램에 자문위원을 부른다.
   *
   * 계정은 이메일 하나에 하나다. 같은 분을 다른 프로그램에 다시 부를 때 계정을 새로 만들면
   * 이전 심사 이력과 끊기므로, 이미 있는 자문위원 계정이면 그대로 쓰고 초대만 새로 만든다.
   */
  inviteAdvisor(input: { programId: string; name: string; email: string; actorId: string }): Promise<
    | { status: "INVITED"; userId: string; invitationId: string; reusedAccount: boolean }
    | { status: "ALREADY_INVITED" }
    | { status: "EMAIL_TAKEN" }
  >;
  findActiveInvitation(target: AdvisorInvitationTarget): Promise<{ id: string } | null>;
  issueToken(input: { invitationId: string; tokenHash: string; expiresAt: Date; actorId: string; target: AdvisorInvitationTarget }): Promise<boolean>;
  revokeTokens(input: { invitationId: string; revokedAt: Date; actorId: string; target: AdvisorInvitationTarget }): Promise<boolean>;
  /** 초대 자체를 거둔다. 이 프로그램의 팀 배정도 함께 정리한다. */
  revokeInvitation(input: { revokedAt: Date; actorId: string; target: AdvisorInvitationTarget }): Promise<boolean>;
  assignTeams(input: { userId: string; programId: string; topicIds: string[]; grantedById: string }): Promise<boolean>;
}

export class AdvisorAdminService {
  constructor(private readonly repository: AdvisorAdminRepository) {}

  private assertAdmin(actor: CurrentActor) {
    if (actor.role !== "ADMIN") throw new AdvisorOperationError("관리자만 자문위원을 관리할 수 있습니다.");
  }

  async invite(actor: CurrentActor, input: { programId: string; name: string; email: string }) {
    this.assertAdmin(actor);
    // 자문위원은 학교 계정이 없는 외부 심사위원 몫이다. 교내 주소로 만들어 두면 그 주소의
    // 주인이 구글로 로그인할 때 이미 다른 방식으로 만들어진 계정과 부딪혀 들어오지 못한다.
    // 게다가 역할이 자문위원으로 굳어 학생이나 교수로 되돌아가지도 않는다.
    if (isPusanEmail(input.email)) {
      throw new AdvisorOperationError("부산대학교 계정은 자문위원으로 등록할 수 없습니다. 교내 구성원은 구글 로그인으로 접속한 뒤 권한을 지정해 주세요.");
    }
    const invited = await this.repository.inviteAdvisor({ ...input, actorId: actor.id });
    if (invited.status === "EMAIL_TAKEN") {
      throw new AdvisorOperationError("이미 다른 역할로 쓰이고 있는 이메일입니다. 주소를 확인해 주세요.");
    }
    // 같은 프로그램에 다시 초대하면 새 링크가 나가면서 예전 링크와 접속이 끊긴다. 채점 중인
    // 위원이 그 순간 튕기고 적던 점수가 날아간다. 재발급은 목록에서 따로 하도록 막는다.
    if (invited.status === "ALREADY_INVITED") {
      throw new AdvisorOperationError("이미 이 프로그램에 초대된 자문위원입니다. 초대 링크가 필요하면 목록에서 다시 발급해 주세요.");
    }
    const inviteToken = await this.issueTokenFor(actor, {
      invitationId: invited.invitationId,
      target: { programId: input.programId, userId: invited.userId },
    });
    return { userId: invited.userId, reusedAccount: invited.reusedAccount, inviteToken };
  }

  async reissueToken(actor: CurrentActor, target: AdvisorInvitationTarget) {
    this.assertAdmin(actor);
    const invitation = await this.repository.findActiveInvitation(target);
    if (!invitation) throw new AdvisorOperationError("이 프로그램에 초대된 자문위원이 아닙니다.");
    const now = new Date();
    await this.repository.revokeTokens({ invitationId: invitation.id, revokedAt: now, actorId: actor.id, target });
    return this.issueTokenFor(actor, { invitationId: invitation.id, target }, now);
  }

  async revoke(actor: CurrentActor, target: AdvisorInvitationTarget) {
    this.assertAdmin(actor);
    const revoked = await this.repository.revokeInvitation({ revokedAt: new Date(), actorId: actor.id, target });
    if (!revoked) throw new AdvisorOperationError("이 프로그램에 초대된 자문위원이 아닙니다.");
  }

  async assignTeams(actor: CurrentActor, input: { userId: string; programId: string; topicIds: string[] }) {
    this.assertAdmin(actor);
    // 초대가 없는 위원에게 팀을 붙이면 회수해 둔 사람에게 파일이 다시 열린다.
    const invitation = await this.repository.findActiveInvitation({ programId: input.programId, userId: input.userId });
    if (!invitation) throw new AdvisorOperationError("이 프로그램에 초대된 자문위원이 아닙니다.");
    const saved = await this.repository.assignTeams({ ...input, grantedById: actor.id });
    if (!saved) throw new AdvisorOperationError("팀 할당을 저장하지 못했습니다.");
  }

  private async issueTokenFor(
    actor: CurrentActor,
    input: { invitationId: string; target: AdvisorInvitationTarget },
    now = new Date(),
  ) {
    const { token, tokenHash } = generateAdvisorToken();
    const issued = await this.repository.issueToken({
      invitationId: input.invitationId,
      tokenHash,
      expiresAt: advisorTokenExpiry(now),
      actorId: actor.id,
      target: input.target,
    });
    if (!issued) throw new AdvisorOperationError("초대 토큰을 발급하지 못했습니다.");
    return token;
  }
}
