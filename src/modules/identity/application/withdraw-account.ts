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
    // 자문위원은 관리자가 발급한 초대 토큰으로만 들어온다. 스스로 탈퇴하면 되돌릴 길이
    // 네 개 모두 막힌다. 토큰 로그인은 ACTIVE 검사에 걸리고, 관리자 자문위원 목록은
    // ACTIVE 만 조회해 목록에서 사라지고, 같은 주소로 다시 등록하면 기존 ADVISOR 를
    // 발견해 "목록에서 다시 발급해 주세요" 로 거부하고, 사용자 관리의 재활성화도
    // WITHDRAWN 이면 아무 일도 하지 않는다. 8/28 최종발표회처럼 외부 심사위원이 실제로
    // 보는 화면이라 한 번 누르면 운영이 막힌다. 관리자 회수로만 처리한다.
    if (actor.role === "ADVISOR") {
      throw new AccountWithdrawalError(
        "자문위원 계정은 스스로 탈퇴할 수 없습니다. 참여를 끝내려면 운영진에게 초대 회수를 요청해 주세요.",
      );
    }
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
