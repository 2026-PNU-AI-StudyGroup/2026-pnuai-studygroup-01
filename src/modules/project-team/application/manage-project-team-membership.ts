import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type ProjectTeamMembershipOutcome =
  | "UPDATED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "LEADER_TRANSFER_REQUIRED"
  | "NOT_ACTIVE"
  | "CONFLICT";

export interface ProjectTeamMembershipRepository {
  leave(input: { projectTeamId: string; actor: CurrentActor; changedAt: Date }): Promise<ProjectTeamMembershipOutcome>;
  remove(input: { projectTeamId: string; targetUserId: string; actor: CurrentActor; changedAt: Date }): Promise<ProjectTeamMembershipOutcome>;
  transferLeadership(input: { projectTeamId: string; nextLeaderId: string; actor: CurrentActor; changedAt: Date }): Promise<ProjectTeamMembershipOutcome>;
}

export class ProjectTeamMembershipOperationError extends Error {}

export class ProjectTeamMembershipService {
  constructor(
    private readonly repository: ProjectTeamMembershipRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  leave(actor: CurrentActor, projectTeamId: string) {
    return this.ensure(this.repository.leave({ projectTeamId, actor, changedAt: this.now() }));
  }

  remove(actor: CurrentActor, projectTeamId: string, targetUserId: string) {
    return this.ensure(this.repository.remove({ projectTeamId, targetUserId, actor, changedAt: this.now() }));
  }

  transferLeadership(actor: CurrentActor, projectTeamId: string, nextLeaderId: string) {
    return this.ensure(this.repository.transferLeadership({ projectTeamId, nextLeaderId, actor, changedAt: this.now() }));
  }

  private async ensure(outcomePromise: Promise<ProjectTeamMembershipOutcome>) {
    const outcome = await outcomePromise;
    if (outcome === "UPDATED") return;
    const message: Record<Exclude<ProjectTeamMembershipOutcome, "UPDATED">, string> = {
      NOT_FOUND: "프로젝트 팀 또는 구성원을 찾을 수 없습니다.",
      FORBIDDEN: "구성원을 변경할 권한이 없습니다.",
      LEADER_TRANSFER_REQUIRED: "팀장은 다른 현재 팀원에게 팀장을 이전한 뒤 탈퇴하거나 제외할 수 있습니다.",
      NOT_ACTIVE: "진행 중인 프로젝트에서만 일반 구성 변경을 할 수 있습니다.",
      CONFLICT: "현재 구성과 충돌하여 변경하지 못했습니다.",
    };
    throw new ProjectTeamMembershipOperationError(message[outcome]);
  }
}
