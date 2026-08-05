import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProjectApprovalsPage from "@/app/project-approvals/page";
import RecruitmentApplicationsPage from "@/app/recruitments/applications/page";
import MyRecruitmentPostsPage from "@/app/recruitments/mine/page";

const {
  getCurrentActor,
  listApplicationHistory,
  listAuthoredPosts,
  listLeaderTeams,
  listProjectApprovals,
  listStudentCreatableOpen,
} = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  listApplicationHistory: vi.fn(),
  listAuthoredPosts: vi.fn(),
  listLeaderTeams: vi.fn(),
  listProjectApprovals: vi.fn(),
  listStudentCreatableOpen: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({ getLocalizedMetadata: vi.fn() }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/student-team/application/manage-student-team-recruitment", () => ({
  StudentTeamRecruitmentQueryService: class {
    listApplicationHistory = listApplicationHistory;
    listAuthoredPosts = listAuthoredPosts;
    listLeaderTeams = listLeaderTeams;
  },
}));
vi.mock("@/modules/topic-approval/application/manage-topic-approvals", () => ({
  TopicApprovalService: class { list = listProjectApprovals; },
}));
vi.mock("@/modules/project-program/application/manage-project-programs", () => ({
  ProjectProgramService: class { listStudentCreatableOpen = listStudentCreatableOpen; },
}));
vi.mock("@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository", () => ({ PrismaStudentTeamRecruitmentQueryRepository: class {} }));
vi.mock("@/modules/topic-approval/infrastructure/prisma-topic-approval-repository", () => ({ PrismaTopicApprovalRepository: class {} }));
vi.mock("@/modules/project-program/infrastructure/prisma-project-program-repository", () => ({ PrismaProjectProgramRepository: class {} }));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/_components/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/modules/student-team/ui/student-team-section-layout", () => ({
  StudentTeamSectionLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
  StudentTeamPageIntro: ({ title, description, meta, action }: { title: string; description: string; meta?: ReactNode; action?: ReactNode }) => (
    <header><h1>{title}</h1><p>{description}</p>{meta}{action}</header>
  ),
  StudentTeamPagination: () => null,
}));
vi.mock("@/modules/student-team/ui/team-modal", () => ({ TeamModal: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/app/recruitments/_components/recruitment-post-form", () => ({ RecruitmentPostForm: () => null }));
vi.mock("@/app/_components/project-approval-ledger", () => ({ ProjectApprovalLedger: () => null }));

const student = { id: "student-1", name: "정하늘", role: "STUDENT" as const };

describe("빈 목록 CTA", () => {
  beforeEach(() => {
    getCurrentActor.mockReset();
    listApplicationHistory.mockReset();
    listAuthoredPosts.mockReset();
    listLeaderTeams.mockReset();
    listProjectApprovals.mockReset();
    listStudentCreatableOpen.mockReset();
    getCurrentActor.mockResolvedValue(student);
  });

  it("보낸 지원이 없으면 빈 상태의 모집 탐색 링크만 보여준다", async () => {
    listApplicationHistory.mockResolvedValue({ applications: [], total: 0, page: 1, totalPages: 1 });

    render(await RecruitmentApplicationsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "모집 둘러보기" })).toHaveAttribute("href", "/recruitments");
    expect(screen.queryByRole("link", { name: "모집 글 탐색" })).not.toBeInTheDocument();
  });

  it("내 모집이 없으면 빈 상태의 새 모집 링크만 보여준다", async () => {
    listAuthoredPosts.mockResolvedValue({ posts: [], total: 0, page: 1, totalPages: 1 });
    listLeaderTeams.mockResolvedValue([]);

    render(await MyRecruitmentPostsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByRole("link", { name: "새 모집" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "새 모집" })).toHaveAttribute("href", "/recruitments/mine?modal=new");
  });

  it("프로젝트 승인 요청이 없으면 빈 상태의 제안 링크만 보여준다", async () => {
    listProjectApprovals.mockResolvedValue({ items: [], page: 1, totalPages: 1, total: 0 });
    listStudentCreatableOpen.mockResolvedValue([{ id: "program-1" }]);

    render(await ProjectApprovalsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: "프로젝트 제안" })).toHaveAttribute("href", "/projects/new");
    expect(screen.queryByRole("link", { name: "새 프로젝트 만들기" })).not.toBeInTheDocument();
  });
});
