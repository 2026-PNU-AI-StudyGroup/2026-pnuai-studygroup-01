import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type WithdrawAccountOutcome =
  | "WITHDRAWN"
  | "NOT_FOUND"
  | "ALREADY_WITHDRAWN"
  | "STUDENT_TEAM_LEADER"
  | "PROJECT_TEAM_LEADER"
  | "ACTIVE_PROJECTS"
  | "LAST_ADMIN";

export interface AccountWithdrawalRepository {
  withdraw(userId: string, withdrawnAt: Date): Promise<WithdrawAccountOutcome>;
}

export class AccountWithdrawalError extends Error {}

export class WithdrawAccountService {
  constructor(
    private readonly repository: AccountWithdrawalRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(actor: CurrentActor) {
    const outcome = await this.repository.withdraw(actor.id, this.now());
    if (outcome === "WITHDRAWN") return;
    const messages: Record<Exclude<WithdrawAccountOutcome, "WITHDRAWN">, string> = {
      NOT_FOUND: "계정을 찾을 수 없습니다.",
      ALREADY_WITHDRAWN: "이미 탈퇴한 계정입니다.",
      STUDENT_TEAM_LEADER: "학생 팀장은 다른 현재 팀원에게 팀장을 이전한 뒤 탈퇴할 수 있습니다.",
      PROJECT_TEAM_LEADER: "진행 프로젝트 팀장은 다른 현재 팀원에게 팀장을 이전한 뒤 탈퇴할 수 있습니다.",
      ACTIVE_PROJECTS: "담당 중인 프로젝트를 다른 교수에게 인계하거나 완료한 뒤 탈퇴할 수 있습니다.",
      LAST_ADMIN: "마지막 활성 관리자 계정은 탈퇴할 수 없습니다.",
    };
    throw new AccountWithdrawalError(messages[outcome]);
  }
}
