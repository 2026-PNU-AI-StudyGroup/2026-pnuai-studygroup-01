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
vi.mock("@/app/recruitments/_lib/recruit-members-entry", () => ({
  recruitMembersEntry: async () => ({ href: "/teams/manage/team-1?modal=recruitment", label: "팀원 모집하기" }),
}));
vi.mock("@/app/_components/recruitment-post-form", () => ({ RecruitmentPostForm: () => null }));

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

  it("보낸 지원이 없어도 모집 공고를 쓰러 가는 길과 둘러보는 길을 하나씩만 둔다", async () => {
    // 두 링크는 목적지가 다르다. 하나는 공고 작성, 하나는 다른 팀 공고 둘러보기다.
    // 예전에는 상단 버튼이 "팀원 모집" 이라는 이름으로 둘러보기로만 보내 같은 길이 두 번 있었다.
    listApplicationHistory.mockResolvedValue({ applications: [], total: 0, page: 1, totalPages: 1 });

    render(await RecruitmentApplicationsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "팀원 모집하기" }))
      .toHaveAttribute("href", "/teams/manage/team-1?modal=recruitment");
    expect(screen.getByRole("link", { name: "모집 공고 둘러보기" })).toHaveAttribute("href", "/recruitments");
  });

});
