import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RecruitmentApplicationsPage from "@/app/recruitments/applications/page";

const {
  getCurrentActor,
  listApplicationHistory,
  listAuthoredPosts,
  listLeaderTeams,
  redirect,
} = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  listApplicationHistory: vi.fn(),
  listAuthoredPosts: vi.fn(),
  listLeaderTeams: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/modules/translation/infrastructure/localized-metadata", () => ({ getLocalizedMetadata: vi.fn() }));
vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/student-team/application/manage-student-team-recruitment", () => ({
  StudentTeamRecruitmentQueryService: class {
    listApplicationHistory = listApplicationHistory;
    listAuthoredPosts = listAuthoredPosts;
    listLeaderTeams = listLeaderTeams;
  },
}));
vi.mock("@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository", () => ({ PrismaStudentTeamRecruitmentQueryRepository: class {} }));
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

const student = { id: "student-1", name: "정하늘", role: "STUDENT" as const };

describe("빈 목록 CTA", () => {
  beforeEach(() => {
    getCurrentActor.mockReset();
    listApplicationHistory.mockReset();
    listAuthoredPosts.mockReset();
    listLeaderTeams.mockReset();
    redirect.mockReset();
    getCurrentActor.mockResolvedValue(student);
  });

  it("보낸 지원이 없으면 빈 상태의 팀원 모집 링크만 보여준다", async () => {
    listApplicationHistory.mockResolvedValue({ applications: [], total: 0, page: 1, totalPages: 1 });

    render(await RecruitmentApplicationsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "팀원 모집" })).toHaveAttribute("href", "/recruitments");
  });

});
