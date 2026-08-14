import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProgramCreateRoutePage,
  ProgramManagementRoutePage,
} from "@/app/topics/_management/program-management-route-page";

const {
  buildAdminProgramSidebarItems,
  getCurrentActor,
  listAdminPendingCountsByProgram,
  listPrograms,
  programCreateWorkspace,
  programManagementWorkspace,
  programSidebar,
  redirect,
} = vi.hoisted(() => ({
  buildAdminProgramSidebarItems: vi.fn().mockReturnValue([]),
  getCurrentActor: vi.fn(),
  listAdminPendingCountsByProgram: vi.fn(),
  listPrograms: vi.fn(),
  programCreateWorkspace: vi.fn(),
  programManagementWorkspace: vi.fn(),
  programSidebar: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/project-program/application/manage-project-programs", () => ({
  ProjectProgramService: class { listAll = listPrograms; },
}));
vi.mock("@/modules/topic-approval/application/manage-topic-approvals", () => ({
  TopicApprovalService: class {
    listAdminPendingCountsByProgram = listAdminPendingCountsByProgram;
  },
}));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({
  PrismaProjectProgramRepository: class {},
}));
vi.mock("@/modules/topic-approval/infrastructure/prisma-topic-approval-repository", () => ({
  PrismaTopicApprovalRepository: class {},
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/topics/_lib/program-sidebar-items", () => ({ buildAdminProgramSidebarItems }));
vi.mock("@/app/_components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/shared/ui/explorer-layout", () => ({
  ExplorerLayout: ({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) => <>{sidebar}{children}</>,
}));
vi.mock("@/app/topics/_components/program-sidebar", () => ({
  ProgramSidebar: (props: unknown) => {
    programSidebar(props);
    return null;
  },
}));
vi.mock("@/app/topics/_management/program-management-workspace", () => ({
  ProgramCreateWorkspace: (props: unknown) => {
    programCreateWorkspace(props);
    return null;
  },
  ProgramManagementWorkspace: (props: unknown) => {
    programManagementWorkspace(props);
    return null;
  },
}));

const programs = [
  { id: "program-1", name: "캡스톤", endsAt: new Date("2026-12-31T00:00:00Z") },
  { id: "program-2", name: "창의융합", endsAt: new Date("2027-12-31T00:00:00Z") },
];

describe("ProgramManagementRoutePage", () => {
  beforeEach(() => {
    getCurrentActor.mockResolvedValue({ id: "admin-1", name: "관리자", role: "ADMIN" });
    listPrograms.mockResolvedValue(programs);
    listAdminPendingCountsByProgram.mockResolvedValue([
      { programId: "program-1", count: 3 },
    ]);
    buildAdminProgramSidebarItems.mockClear();
    programCreateWorkspace.mockReset();
    programManagementWorkspace.mockReset();
    programSidebar.mockReset();
    redirect.mockReset();
  });

  it("경로의 프로그램과 탭 및 승인 대기 건수를 관리 화면에 전달한다", async () => {
    render(await ProgramManagementRoutePage({
      requestedProgramId: "program-1",
      tabSegments: ["reports"],
    }));

    expect(buildAdminProgramSidebarItems).toHaveBeenCalledWith(
      programs,
      "manage",
      "reports",
      expect.any(Date),
      new Map([["program-1", 3]]),
    );
    expect(programManagementWorkspace).toHaveBeenCalledWith(expect.objectContaining({
      actor: expect.objectContaining({ role: "ADMIN" }),
      programId: "program-1",
      tab: "reports",
      pendingApprovalCount: 3,
    }));
  });

  it.each([
    { programId: "program-1", tabSegments: ["settings"], href: "/topics/manage/program-1" },
    { programId: "program-1", tabSegments: ["unknown"], href: "/topics/manage/program-1" },
    { programId: "missing", tabSegments: ["votes"], href: "/topics/manage/program-1/votes" },
  ])("비정식 주소를 $href로 정규화한다", async ({ programId, tabSegments, href }) => {
    redirect.mockImplementationOnce((target: string) => {
      throw new Error(`REDIRECT:${target}`);
    });

    await expect(ProgramManagementRoutePage({
      requestedProgramId: programId,
      tabSegments,
    })).rejects.toThrow(`REDIRECT:${href}`);

    expect(redirect).toHaveBeenCalledWith(href);
  });

  it("프로그램 생성 화면의 취소 주소는 기본 프로그램 설정 경로다", async () => {
    render(await ProgramCreateRoutePage());

    expect(buildAdminProgramSidebarItems).toHaveBeenCalledWith(
      programs,
      "create",
      "settings",
      expect.any(Date),
      new Map([["program-1", 3]]),
    );
    expect(programCreateWorkspace).toHaveBeenCalledWith({
      cancelHref: "/topics/manage/program-1",
    });
  });

  it("프로그램이 없으면 생성 경로로 이동한다", async () => {
    listPrograms.mockResolvedValue([]);
    redirect.mockImplementationOnce((target: string) => {
      throw new Error(`REDIRECT:${target}`);
    });

    await expect(ProgramManagementRoutePage({})).rejects.toThrow("REDIRECT:/topics/manage/new");

    expect(redirect).toHaveBeenCalledWith("/topics/manage/new");
  });
});
