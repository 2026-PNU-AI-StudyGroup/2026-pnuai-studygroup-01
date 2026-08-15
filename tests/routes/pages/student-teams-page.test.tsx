import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StudentTeamsPage from "@/app/teams/page";

const { getCurrentActor, listWorkspace } = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  listWorkspace: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({ getLocalizedMetadata: vi.fn() }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/student-team/application/manage-student-teams", () => ({
  StudentTeamQueryService: class { listWorkspace = listWorkspace; },
}));
vi.mock("@/modules/student-team/infrastructure/prisma-student-team-query-repository", () => ({
  PrismaStudentTeamQueryRepository: class {},
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/_components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/modules/student-team/ui/student-team-section-layout", () => ({
  StudentTeamSectionLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
  StudentTeamPageIntro: ({ title, description, action, meta }: { title: string; description: string; action?: ReactNode; meta?: ReactNode }) => (
    <header><h1>{title}</h1><p>{description}</p>{meta}<div>{action}</div></header>
  ),
}));
vi.mock("@/app/teams/_components/student-team-ledger", () => ({
  StudentTeamLedger: () => <div>팀 목록</div>,
}));
vi.mock("@/app/teams/_components/student-team-controls", () => ({
  CreateStudentTeamForm: () => null,
  InvitationDecisionForm: () => null,
}));
vi.mock("@/modules/student-team/ui/team-modal", () => ({ TeamModal: () => null }));

describe("StudentTeamsPage", () => {
  beforeEach(() => {
    getCurrentActor.mockReset();
    listWorkspace.mockReset();
    getCurrentActor.mockResolvedValue({ id: "student-1", name: "정하늘", role: "STUDENT" });
  });

  it("참여 팀 제목과 개수를 실제 목록 영역 한 곳에서만 보여준다", async () => {
    listWorkspace.mockResolvedValue({ teams: [{ id: "team-1" }], invitations: [] });

    render(await StudentTeamsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "내 팀" })).toBeInTheDocument();
    expect(screen.getAllByText("참여 중인 팀")).toHaveLength(1);
    expect(screen.getAllByText("1개")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /받은 초대/ })).not.toBeInTheDocument();
  });

  it("팀과 초대가 없으면 빈 상태의 팀 만들기 진입점만 보여준다", async () => {
    listWorkspace.mockResolvedValue({ teams: [], invitations: [] });

    render(await StudentTeamsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "첫 팀 만들기" })).toHaveAttribute("href", "/teams?modal=create");
    expect(screen.queryByRole("link", { name: "새 팀 만들기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /받은 초대/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "학생 프로젝트 등록" })).not.toBeInTheDocument();
  });
});
