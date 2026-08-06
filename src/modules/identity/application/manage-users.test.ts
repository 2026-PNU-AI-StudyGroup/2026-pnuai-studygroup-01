import { describe, expect, it, vi } from "vitest";

import { UserAdministrationError, UserAdministrationService, type UserAdministrationRepository } from "@/modules/identity/application/manage-users";

const admin = { id: "admin-1", role: "ADMIN" } as const;

describe("사용자 상태 관리", () => {
  it("관리자가 사용자 계정을 비활성화한다", async () => {
    const repository = { setActive: vi.fn().mockResolvedValue("UPDATED") } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(repository).setActive(admin, "student-1", false)).resolves.toBe("UPDATED");
    expect(repository.setActive).toHaveBeenCalledWith(expect.objectContaining({ actorId: "admin-1", targetId: "student-1", isActive: false }));
  });

  it("본인과 마지막 관리자의 비활성화를 막는다", async () => {
    const selfRepository = { setActive: vi.fn().mockResolvedValue("SELF_DEACTIVATION") } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(selfRepository).setActive(admin, "admin-1", false)).rejects.toBeInstanceOf(UserAdministrationError);
    const lastRepository = { setActive: vi.fn().mockResolvedValue("LAST_ADMIN") } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(lastRepository).setActive(admin, "admin-2", false)).rejects.toBeInstanceOf(UserAdministrationError);
  });

  it("학생의 관리 접근을 거절한다", async () => {
    const repository = {} as UserAdministrationRepository;
    await expect(new UserAdministrationService(repository).setActive({ id: "student-1", role: "STUDENT" }, "student-2", false)).rejects.toBeInstanceOf(UserAdministrationError);
  });

  it("담당 프로젝트가 있는 교수 계정 비활성화를 차단한다", async () => {
    const repository = { setActive: vi.fn().mockResolvedValue("ACTIVE_PROJECTS") } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(repository).setActive(admin, "professor-1", false))
      .rejects.toThrow("담당 중인 프로젝트가 있는 교수 계정은 비활성화할 수 없습니다.");
  });
});
