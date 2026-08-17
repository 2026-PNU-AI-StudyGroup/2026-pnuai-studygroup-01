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

describe("관리자 권한 관리", () => {
  it("관리자가 다른 계정에 관리자 권한을 부여한다", async () => {
    const repository = { setAdminRole: vi.fn().mockResolvedValue("UPDATED") } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(repository).setAdminRole(admin, "student-1", true)).resolves.toBe("UPDATED");
    expect(repository.setAdminRole).toHaveBeenCalledWith(expect.objectContaining({ actorId: "admin-1", targetId: "student-1", isAdmin: true }));
  });

  it("본인과 마지막 관리자의 권한 해제를 막는다", async () => {
    const selfRepository = { setAdminRole: vi.fn().mockResolvedValue("SELF_DEMOTION") } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(selfRepository).setAdminRole(admin, "admin-1", false))
      .rejects.toThrow("현재 로그인한 관리자 계정의 권한은 해제할 수 없습니다.");
    const lastRepository = { setAdminRole: vi.fn().mockResolvedValue("LAST_ADMIN") } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(lastRepository).setAdminRole(admin, "admin-2", false))
      .rejects.toThrow("마지막 관리자 계정의 권한은 해제할 수 없습니다.");
  });

  it("외부 자문위원과 탈퇴 계정의 권한 변경을 차단한다", async () => {
    const advisorRepository = { setAdminRole: vi.fn().mockResolvedValue("EXTERNAL_ADVISOR") } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(advisorRepository).setAdminRole(admin, "advisor-1", true))
      .rejects.toThrow("외부 자문위원 계정은 관리자로 지정할 수 없습니다.");
    const withdrawnRepository = { setAdminRole: vi.fn().mockResolvedValue("WITHDRAWN") } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(withdrawnRepository).setAdminRole(admin, "student-9", true))
      .rejects.toThrow("탈퇴한 계정의 권한은 변경할 수 없습니다.");
  });

  it("관리자가 아닌 사용자의 권한 변경을 거절한다", async () => {
    const repository = { setAdminRole: vi.fn() } as unknown as UserAdministrationRepository;
    await expect(new UserAdministrationService(repository).setAdminRole({ id: "professor-1", role: "PROFESSOR" }, "student-1", true))
      .rejects.toBeInstanceOf(UserAdministrationError);
    expect(repository.setAdminRole).not.toHaveBeenCalled();
  });
});
