import { describe, expect, it, vi } from "vitest";
import { StudentTeamOperationError, StudentTeamService } from "@/modules/student-team/application/manage-student-teams";
import type { StudentTeamRepository } from "@/modules/student-team/application/student-team-ports";

const actor = { id: "student-1", role: "STUDENT" as const, name: "김학생", email: "student@pusan.ac.kr", image: null };

function repository(): StudentTeamRepository {
  return {
    listMine: vi.fn(async () => []),
    listInvitations: vi.fn(async () => []),
    create: vi.fn(async () => "team-1"),
    invite: vi.fn(async () => "INVITED" as const),
    respond: vi.fn(async () => "ACCEPTED" as const),
    transferLeadership: vi.fn(async () => true),
    removeMember: vi.fn(async () => true),
    delete: vi.fn(async () => true),
  };
}

describe("지속형 학생 팀 관리", () => {
  it("팀 생성 시 요청자를 팀장으로 저장한다", async () => {
    const store = repository();
    const now = new Date("2026-07-24T00:00:00Z");
    await expect(new StudentTeamService(store, () => now).create(actor, { name: " 코드웨이브 ", description: " 협업 팀 " })).resolves.toBe("team-1");
    expect(store.create).toHaveBeenCalledWith({ leaderId: actor.id, name: "코드웨이브", description: "협업 팀", createdAt: now });
  });

  it("팀장 자신 또는 교외 이메일 초대를 거절한다", async () => {
    const service = new StudentTeamService(repository());
    await expect(service.invite(actor, { teamId: "team-1", email: actor.email })).rejects.toBeInstanceOf(StudentTeamOperationError);
    await expect(service.invite(actor, { teamId: "team-1", email: "other@example.com" })).rejects.toBeInstanceOf(StudentTeamOperationError);
  });

  it("팀장 삭제는 저장소의 아카이브 보존 삭제 경계를 호출한다", async () => {
    const store = repository();
    const now = new Date("2026-07-24T00:00:00Z");
    await new StudentTeamService(store, () => now).delete(actor, "team-1");
    expect(store.delete).toHaveBeenCalledWith({ teamId: "team-1", leaderId: actor.id, deletedAt: now });
  });
});
