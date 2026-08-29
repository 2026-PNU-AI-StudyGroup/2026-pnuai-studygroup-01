import { describe, expect, it, vi } from "vitest";

import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  AccountWithdrawalError,
  WithdrawAccountService,
  type WithdrawAccountOutcome,
} from "@/modules/identity/application/withdraw-account";

const actorOf = (role: string) => ({ id: "user-1", role, name: "테스터" } as unknown as CurrentActor);

const serviceWith = (outcome: WithdrawAccountOutcome) => {
  const withdraw = vi.fn().mockResolvedValue(outcome);
  return { service: new WithdrawAccountService({ withdraw }), withdraw };
};

describe("WithdrawAccountService", () => {
  it("학생은 탈퇴할 수 있다", async () => {
    const { service, withdraw } = serviceWith("WITHDRAWN");
    await expect(service.execute(actorOf("STUDENT"))).resolves.toBeUndefined();
    expect(withdraw).toHaveBeenCalledOnce();
  });

  // 자문위원이 탈퇴하면 토큰 로그인·관리자 목록·재등록·재활성화 네 경로가 모두 막혀
  // 관리자도 되살릴 수 없다. 저장소에 닿기 전에 막는다.
  it("자문위원은 스스로 탈퇴할 수 없다", async () => {
    const { service, withdraw } = serviceWith("WITHDRAWN");
    await expect(service.execute(actorOf("ADVISOR"))).rejects.toThrow(AccountWithdrawalError);
    expect(withdraw).not.toHaveBeenCalled();
  });

  it("막힌 이유를 문구로 알려 준다", async () => {
    const { service } = serviceWith("PROJECT_TEAM_LEADER");
    await expect(service.execute(actorOf("STUDENT"))).rejects.toThrow(/팀장을 이전한 뒤/);
  });
});
