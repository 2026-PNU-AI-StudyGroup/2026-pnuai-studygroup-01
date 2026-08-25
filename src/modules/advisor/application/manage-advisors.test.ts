import { describe, expect, it, vi } from "vitest";
import { AdvisorAdminService, AdvisorOperationError } from "@/modules/advisor/application/manage-advisors";

const admin = { id: "admin-1", role: "ADMIN" as const };
const student = { id: "stu-1", role: "STUDENT" as const };

function repository() {
  return {
    registerAdvisor: vi.fn().mockResolvedValue({ userId: "adv-1", created: true }),
    issueToken: vi.fn().mockResolvedValue(true),
    revokeTokens: vi.fn().mockResolvedValue(true),
    assignTeams: vi.fn().mockResolvedValue(true),
  };
}

describe("AdvisorAdminService", () => {
  it("관리자만 자문위원을 등록할 수 있다", async () => {
    const repo = repository();
    const service = new AdvisorAdminService(repo);
    await expect(service.register(student, { name: "김위원", email: "advisor@example.com" }))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    await service.register(admin, { name: "김위원", email: "advisor@example.com" });
    expect(repo.registerAdvisor).toHaveBeenCalledOnce();
  });

  it("부산대학교 계정은 자문위원으로 등록하지 않는다", async () => {
    const repo = repository();
    const service = new AdvisorAdminService(repo);
    await expect(service.register(admin, { name: "김교수", email: "prof@pusan.ac.kr" }))
      .rejects.toBeInstanceOf(AdvisorOperationError);
    // 교내 주소로 자문위원 계정을 만들어 두면 그 주소의 주인이 구글로 못 들어온다.
    expect(repo.registerAdvisor).not.toHaveBeenCalled();
  });

  it("등록 시 토큰을 발급하고 원문 토큰을 반환한다", async () => {
    const service = new AdvisorAdminService(repository());
    const result = await service.register(admin, { name: "김위원", email: "advisor@example.com" });
    expect(result.inviteToken).toMatch(/^[A-Za-z0-9_-]{43,}$/);
  });

  it("revoke가 revokeTokens를 호출하며, 관리자가 아니면 거부한다", async () => {
    const repo = repository();
    const service = new AdvisorAdminService(repo);
    await expect(service.revoke(student, "adv-1")).rejects.toBeInstanceOf(AdvisorOperationError);
    expect(repo.revokeTokens).not.toHaveBeenCalled();

    await service.revoke(admin, "adv-1");
    expect(repo.revokeTokens).toHaveBeenCalledOnce();
    expect(repo.revokeTokens).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "adv-1", revokedAt: expect.any(Date) }),
    );
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
});
