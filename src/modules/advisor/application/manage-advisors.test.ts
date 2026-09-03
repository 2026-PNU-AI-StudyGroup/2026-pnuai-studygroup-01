import { describe, expect, it, vi } from "vitest";
import { AdvisorAdminService, AdvisorOperationError } from "@/modules/advisor/application/manage-advisors";

const admin = { id: "admin-1", role: "ADMIN" as const };
const student = { id: "stu-1", role: "STUDENT" as const };
const target = { programId: "prog-1", userId: "adv-1" };

function repository() {
  return {
    inviteAdvisor: vi.fn().mockResolvedValue({ status: "INVITED", userId: "adv-1", invitationId: "inv-1", reusedAccount: false }),
    findActiveInvitation: vi.fn().mockResolvedValue({ id: "inv-1" }),
    issueToken: vi.fn().mockResolvedValue(true),
    revokeTokens: vi.fn().mockResolvedValue(true),
    revokeInvitation: vi.fn().mockResolvedValue(true),
    assignTeams: vi.fn().mockResolvedValue(true),
  };
}

describe("AdvisorAdminService", () => {
  it("관리자만 자문위원을 초대할 수 있다", async () => {
    const repo = repository();
    const service = new AdvisorAdminService(repo);
    await expect(service.invite(student, { programId: "prog-1", name: "김위원", email: "advisor@example.com" }))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    await service.invite(admin, { programId: "prog-1", name: "김위원", email: "advisor@example.com" });
    expect(repo.inviteAdvisor).toHaveBeenCalledOnce();
  });

  it("부산대학교 계정은 자문위원으로 초대하지 않는다", async () => {
    const repo = repository();
    const service = new AdvisorAdminService(repo);
    await expect(service.invite(admin, { programId: "prog-1", name: "김교수", email: "prof@pusan.ac.kr" }))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    // 교내 주소로 자문위원 계정을 만들어 두면 그 주소의 주인이 구글로 못 들어온다.
    expect(repo.inviteAdvisor).not.toHaveBeenCalled();
  });

  it("초대는 프로그램을 그대로 실어 보내고 원문 토큰을 돌려준다", async () => {
    const repo = repository();
    const service = new AdvisorAdminService(repo);
    const result = await service.invite(admin, { programId: "prog-1", name: "김위원", email: "advisor@example.com" });
    expect(result.inviteToken).toMatch(/^[A-Za-z0-9_-]{43,}$/);
    expect(repo.inviteAdvisor).toHaveBeenCalledWith(expect.objectContaining({ programId: "prog-1" }));
    expect(repo.issueToken).toHaveBeenCalledWith(expect.objectContaining({ invitationId: "inv-1", target }));
  });

  it("같은 프로그램에 이미 있는 위원은 다시 초대하지 않는다", async () => {
    const repo = repository();
    repo.inviteAdvisor.mockResolvedValue({ status: "ALREADY_INVITED" });
    const service = new AdvisorAdminService(repo);
    await expect(service.invite(admin, { programId: "prog-1", name: "김위원", email: "advisor@example.com" }))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    // 링크를 새로 내보내면 채점 중인 위원이 그 자리에서 튕긴다.
    expect(repo.issueToken).not.toHaveBeenCalled();
  });

  it("다른 프로그램에 있던 계정을 다시 쓰면 그 사실을 알린다", async () => {
    const repo = repository();
    repo.inviteAdvisor.mockResolvedValue({ status: "INVITED", userId: "adv-1", invitationId: "inv-2", reusedAccount: true });
    const service = new AdvisorAdminService(repo);
    const result = await service.invite(admin, { programId: "prog-2", name: "김위원", email: "advisor@example.com" });
    expect(result.reusedAccount).toBe(true);
  });

  it("revoke는 프로그램 단위로 초대를 거두고, 관리자가 아니면 거부한다", async () => {
    const repo = repository();
    const service = new AdvisorAdminService(repo);
    await expect(service.revoke(student, target)).rejects.toBeInstanceOf(AdvisorOperationError);
    expect(repo.revokeInvitation).not.toHaveBeenCalled();

    await service.revoke(admin, target);
    expect(repo.revokeInvitation).toHaveBeenCalledOnce();
    expect(repo.revokeInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ target, revokedAt: expect.any(Date) }),
    );
  });

  it("초대가 없는 프로그램에서는 재발급도 회수도 하지 않는다", async () => {
    const repo = repository();
    repo.findActiveInvitation.mockResolvedValue(null);
    repo.revokeInvitation.mockResolvedValue(false);
    const service = new AdvisorAdminService(repo);
    await expect(service.reissueToken(admin, target)).rejects.toBeInstanceOf(AdvisorOperationError);
    await expect(service.revoke(admin, target)).rejects.toBeInstanceOf(AdvisorOperationError);
    expect(repo.issueToken).not.toHaveBeenCalled();
  });

  it("assignTeams가 programId·grantedById를 리포지토리에 전달한다", async () => {
    const repo = repository();
    const service = new AdvisorAdminService(repo);
    await service.assignTeams(admin, { userId: "adv-1", programId: "prog-1", topicIds: ["topic-1", "topic-2"] });
    expect(repo.assignTeams).toHaveBeenCalledWith({
      userId: "adv-1",
      programId: "prog-1",
      topicIds: ["topic-1", "topic-2"],
      grantedById: admin.id,
    });
  });

  it("초대받지 않은 프로그램의 팀은 배정하지 않는다", async () => {
    const repo = repository();
    repo.findActiveInvitation.mockResolvedValue(null);
    const service = new AdvisorAdminService(repo);
    // 배정이 남으면 회수한 위원에게 제출물이 계속 열린다. 배정 자체를 막는다.
    await expect(service.assignTeams(admin, { userId: "adv-1", programId: "prog-1", topicIds: ["topic-1"] }))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    expect(repo.assignTeams).not.toHaveBeenCalled();
  });
});
