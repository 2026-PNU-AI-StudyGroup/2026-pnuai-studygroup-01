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
    /** 탈퇴한 계정. 초대로 되살리지 않는다. */
    | { status: "ACCOUNT_DISABLED" }
  >;
  /**
   * 살아 있는 초대. 계정 상태를 함께 돌려준다.
   *
   * 비활성 계정에는 토큰 로그인이 막혀 있어, 상태를 모르고 링크를 내주면 눌러도 열리지
   * 않는 링크가 나간다. 재발급을 막을 근거로 쓴다.
   */
  /** 거둔 초대를 되살린다. 팀 배정은 되살리지 않는다. */
  reinviteAdvisor(input: { programId: string; userId: string; actorId: string }): Promise<
    | { status: "INVITED"; invitationId: string }
    | { status: "ALREADY_INVITED" }
    | { status: "NOT_FOUND" }
    | { status: "ACCOUNT_DISABLED" }
  >;
  findActiveInvitation(target: AdvisorInvitationTarget): Promise<{ id: string; accountStatus: string } | null>;
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
    if (invited.status === "ACCOUNT_DISABLED") {
      throw new AdvisorOperationError("탈퇴한 계정은 자문위원으로 다시 초대할 수 없습니다.");
    }
    const inviteToken = await this.issueTokenFor(actor, {
      invitationId: invited.invitationId,
      target: { programId: input.programId, userId: invited.userId },
    });
    return { userId: invited.userId, reusedAccount: invited.reusedAccount, inviteToken };
  }

  /**
   * 거둔 초대를 되살리고 새 링크를 낸다.
   *
   * 회수가 링크까지 거둬 두었으니 초대만 세워서는 위원이 들어올 수 없다. 초대와 링크를
   * 한 번에 처리해 운영자가 곧바로 전달할 수 있게 한다.
   */
  async reinvite(actor: CurrentActor, target: AdvisorInvitationTarget) {
    this.assertAdmin(actor);
    const revived = await this.repository.reinviteAdvisor({ ...target, actorId: actor.id });
    if (revived.status === "NOT_FOUND") {
      throw new AdvisorOperationError("이 프로그램에서 회수한 자문위원이 아닙니다.");
    }
    if (revived.status === "ALREADY_INVITED") {
      throw new AdvisorOperationError("이미 이 프로그램에 초대된 자문위원입니다. 초대 링크가 필요하면 목록에서 다시 발급해 주세요.");
    }
    if (revived.status === "ACCOUNT_DISABLED") {
      throw new AdvisorOperationError("탈퇴한 계정은 자문위원으로 다시 초대할 수 없습니다.");
    }
    return this.issueTokenFor(actor, { invitationId: revived.invitationId, target });
  }

  async reissueToken(actor: CurrentActor, target: AdvisorInvitationTarget) {
    this.assertAdmin(actor);
    const invitation = await this.repository.findActiveInvitation(target);
    if (!invitation) throw new AdvisorOperationError("이 프로그램에 초대된 자문위원이 아닙니다.");
    // 재발급은 살아 있는 초대의 링크만 바꾼다. 계정을 여는 일은 초대가 한다. 비활성 계정에
    // 링크를 내주면 위원에게는 "만료되었거나 회수되었습니다" 만 보이므로 여기서 끊고,
    // 계정까지 여는 자리(초대 회수 뒤 다시 초대)로 안내한다.
    if (invitation.accountStatus !== "ACTIVE") {
      throw new AdvisorOperationError("비활성 상태인 계정입니다. 초대를 회수한 뒤 다시 초대하면 계정도 함께 활성화되고 새 링크가 발급됩니다.");
    }
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
