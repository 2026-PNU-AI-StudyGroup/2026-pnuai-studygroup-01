import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UsersAdminPage from "@/app/admin/users/page";

const { getCurrentActor, listUsers } = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({ getLocalizedMetadata: vi.fn() }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/identity/application/manage-users", () => ({
  UserAdministrationService: class { list = listUsers; },
  USER_LIST_ROLE_FILTERS: ["ALL", "STUDENT", "PROFESSOR", "ADMIN", "ADVISOR"],
  USER_LIST_STATUS_FILTERS: ["ALL", "ACTIVE", "INACTIVE"],
  resolveUserListRoleFilter: () => "ALL",
  resolveUserListStatusFilter: () => "ALL",
}));
vi.mock("@/modules/identity/infrastructure/prisma-user-administration-repository", () => ({ PrismaUserAdministrationRepository: class {} }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/_components/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/app/_components/admin-workspace", () => ({
  AdminWorkspace: ({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) => (
    <main><h1>{title}</h1>{actions}{children}</main>
  ),
}));
vi.mock("@/app/admin/users/_components/user-status-form", () => ({
  UserStatusForm: ({ name }: { name: string }) => <button type="button">{name} 상태 변경</button>,
}));

const admin = { id: "admin-1", name: "관리자", role: "ADMIN" as const };
describe("관리 화면의 중복·가짜 컨트롤", () => {
  beforeEach(() => {
    getCurrentActor.mockReset();
    listUsers.mockReset();
    getCurrentActor.mockResolvedValue(admin);
  });

  it("현재 관리자는 비활성화 버튼 대신 내 계정 상태를 보여준다", async () => {
    listUsers.mockResolvedValue({
      items: [
        { id: "admin-1", name: "관리자", email: "admin@pusan.ac.kr", role: "ADMIN", isActive: true, createdAt: new Date("2026-01-01") },
        { id: "user-1", name: "홍길동", email: "user@pusan.ac.kr", role: "STUDENT", isActive: true, createdAt: new Date("2026-01-02") },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    });

    render(await UsersAdminPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("내 계정")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "관리자 상태 변경" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홍길동 상태 변경" })).toBeInTheDocument();
  });
});
