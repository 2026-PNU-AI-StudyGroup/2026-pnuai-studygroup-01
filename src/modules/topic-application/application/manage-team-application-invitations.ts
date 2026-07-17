import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import type { TeamApplicationInvitationRepository } from "@/modules/topic-application/application/topic-application-ports";
import { assertCanApplyToTopic } from "@/modules/topic-application/domain/topic-application-policy";

export class TeamApplicationInvitationConflictError extends Error {
  constructor(message = "팀 지원 초대를 현재 처리할 수 없습니다.") {
    super(message);
    this.name = "TeamApplicationInvitationConflictError";
  }
}

export class TeamApplicationInvitationService {
  constructor(
    private readonly repository: TeamApplicationInvitationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(actor: CurrentUser) {
    assertCanApplyToTopic(actor);
    const [received, drafts] = await Promise.all([
      this.repository.listForInvitee(actor.email),
      this.repository.listByLeader(actor.id),
    ]);
    return { received, drafts };
  }

  async respond(actor: CurrentUser, invitationId: string, decision: "ACCEPT" | "DECLINE") {
    assertCanApplyToTopic(actor);
    const outcome = await this.repository.respond(invitationId, { id: actor.id, email: actor.email }, decision, this.now());
    if (outcome === "NOT_FOUND") throw new TeamApplicationInvitationConflictError("팀 지원 초대를 찾을 수 없습니다.");
    if (outcome === "CONFLICT") throw new TeamApplicationInvitationConflictError("이미 처리되었거나 취소된 팀 지원 초대입니다.");
    if (outcome === "TOPIC_UNAVAILABLE") throw new TeamApplicationInvitationConflictError("모집 기간 또는 남은 정원 때문에 팀 지원을 접수할 수 없습니다.");
    if (outcome === "MEMBER_UNAVAILABLE") throw new TeamApplicationInvitationConflictError("팀원 중 이미 지원했거나 같은 학기의 다른 팀에 소속된 사용자가 있습니다.");
    return outcome;
  }

  async cancel(actor: CurrentUser, draftId: string) {
    assertCanApplyToTopic(actor);
    if (!(await this.repository.cancelDraft(draftId, actor.id))) {
      throw new TeamApplicationInvitationConflictError("취소할 팀 지원 준비를 찾을 수 없습니다.");
    }
  }
}
