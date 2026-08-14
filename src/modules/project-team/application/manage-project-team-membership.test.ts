import { describe, expect, it, vi } from "vitest";

import {
  ProjectTeamMembershipOperationError,
  ProjectTeamMembershipService,
  type ProjectTeamMembershipRepository,
} from "@/modules/project-team/application/manage-project-team-membership";

const actor = { id: "student-1", role: "STUDENT" as const };

function repository(outcome: Awaited<ReturnType<ProjectTeamMembershipRepository["removeLeaderAndTransfer"]>>) {
  return {
    leave: vi.fn(async () => "UPDATED" as const),
    remove: vi.fn(async () => "UPDATED" as const),
    transferLeadership: vi.fn(async () => "UPDATED" as const),
    removeLeaderAndTransfer: vi.fn(async () => outcome),
  } satisfies ProjectTeamMembershipRepository;
}

describe("ProjectTeamMembershipService", () => {
  it("팀장 제거와 인계 요청을 하나의 저장소 계약으로 전달한다", async () => {
    const writer = repository("UPDATED");
    const changedAt = new Date("2026-08-14T00:00:00Z");
    const service = new ProjectTeamMembershipService(writer, () => changedAt);

    await expect(service.removeLeaderAndTransfer(actor, "team-1", "leader-1", "member-1")).resolves.toBeUndefined();

    expect(writer.removeLeaderAndTransfer).toHaveBeenCalledWith({
      projectTeamId: "team-1",
      targetUserId: "leader-1",
      nextLeaderId: "member-1",
      actor,
      changedAt,
    });
  });

  it("인계 대상 충돌은 사용자에게 현재 구성 오류로 전달한다", async () => {
    const service = new ProjectTeamMembershipService(repository("CONFLICT"));

    await expect(service.removeLeaderAndTransfer(actor, "team-1", "leader-1", "member-1"))
      .rejects.toEqual(new ProjectTeamMembershipOperationError("현재 구성과 충돌하여 변경하지 못했습니다."));
  });
});
