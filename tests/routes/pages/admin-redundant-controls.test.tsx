import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProgramsAdminPage from "@/app/admin/programs/page";
import UsersAdminPage from "@/app/admin/users/page";

const { getCurrentActor, listPrograms, listUsers } = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  listPrograms: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({ getLocalizedMetadata: vi.fn() }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/project-program/application/manage-project-programs", () => ({
  ProjectProgramService: class { listAll = listPrograms; },
}));
vi.mock("@/modules/identity/application/manage-users", () => ({
  UserAdministrationService: class { list = listUsers; },
}));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({ PrismaProjectProgramRepository: class {} }));
vi.mock("@/modules/identity/infrastructure/prisma-user-administration-repository", () => ({ PrismaUserAdministrationRepository: class {} }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/_components/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/app/_components/admin-workspace", () => ({
  AdminWorkspace: ({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) => (
    <main><h1>{title}</h1>{actions}{children}</main>
  ),
}));
vi.mock("@/app/admin/programs/_components/student-project-creation-form", () => ({
  StudentProjectCreationForm: () => <button type="button">학생 생성 설정</button>,
}));
vi.mock("@/app/admin/programs/_components/program-status-form", () => ({
  ProgramStatusForm: () => <button type="button">프로그램 상태 변경</button>,
}));
vi.mock("@/app/admin/users/_components/user-status-form", () => ({
  UserStatusForm: ({ name }: { name: string }) => <button type="button">{name} 상태 변경</button>,
}));

const admin = { id: "admin-1", name: "관리자", role: "ADMIN" as const };
const program = {
  id: "program-1",
  name: "캡스톤",
  category: "교과",
  startYear: 2026,
  description: "프로그램 설명",
  startsAt: new Date("2026-03-01T00:00:00.000Z"),
  endsAt: new Date("2026-06-30T00:00:00.000Z"),
  status: "CLOSED" as const,
  topicCount: 1,
  teamCount: 1,
  advisorEnabled: true,
  studentProjectCreationEnabled: true,
};

describe("관리 화면의 중복·가짜 컨트롤", () => {
  beforeEach(() => {
    getCurrentActor.mockReset();
    listPrograms.mockReset();
    listUsers.mockReset();
    getCurrentActor.mockResolvedValue(admin);
  });

  it("프로그램 목록이 비어 있으면 빈 상태에만 생성 CTA를 둔다", async () => {
    listPrograms.mockResolvedValue([]);

    render(await ProgramsAdminPage());

    expect(screen.getAllByRole("link", { name: "새 프로그램" })).toHaveLength(1);
  });

  it("마감된 프로그램은 학생 생성 설정을 상태로만 보여준다", async () => {
    listPrograms.mockResolvedValue([program]);

    render(await ProgramsAdminPage());

    expect(screen.getByText(/학생 프로젝트 생성 허용/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "학생 생성 설정" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "프로그램 상태 변경" })).not.toBeInTheDocument();
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
