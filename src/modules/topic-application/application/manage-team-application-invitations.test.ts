import { describe, expect, it, vi } from "vitest";

import { TeamApplicationInvitationConflictError, TeamApplicationInvitationService } from "@/modules/topic-application/application/manage-team-application-invitations";
import type { TeamApplicationInvitationRepository } from "@/modules/topic-application/application/topic-application-ports";

const actor = { id: "student-1", role: "STUDENT" as const, name: "학생", email: "student@pusan.ac.kr", image: null };

function repository(outcome: Awaited<ReturnType<TeamApplicationInvitationRepository["respond"]>> = "PENDING"): TeamApplicationInvitationRepository {
  return {
    listForInvitee: vi.fn(async () => []),
    listByLeader: vi.fn(async () => []),
    respond: vi.fn(async () => outcome),
    cancelDraft: vi.fn(async () => true),
  };
}

describe("팀 지원 초대", () => {
  it("로그인 이메일의 받은 초대와 리더의 준비 중 지원을 함께 조회한다", async () => {
    const target = repository();
    await new TeamApplicationInvitationService(target).list(actor);
    expect(target.listForInvitee).toHaveBeenCalledWith("student@pusan.ac.kr");
    expect(target.listByLeader).toHaveBeenCalledWith("student-1");
  });

  it("마지막 팀원의 수락 결과를 실제 지원 접수로 반환한다", async () => {
    const target = repository("APPLICATION_CREATED");
    await expect(new TeamApplicationInvitationService(target, () => new Date("2026-07-17T00:00:00Z")).respond(actor, "invite-1", "ACCEPT")).resolves.toBe("APPLICATION_CREATED");
  });

  it("정원 부족 승격 실패를 명시적인 충돌로 변환한다", async () => {
    await expect(new TeamApplicationInvitationService(repository("TOPIC_UNAVAILABLE")).respond(actor, "invite-1", "ACCEPT")).rejects.toBeInstanceOf(TeamApplicationInvitationConflictError);
  });
});
