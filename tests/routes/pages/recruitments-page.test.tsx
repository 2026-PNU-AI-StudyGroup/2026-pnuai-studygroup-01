import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import RecruitmentsPage from "@/app/recruitments/page";

const { getCurrentActor, getProfile, listPosts } = vi.hoisted(() => ({
  getCurrentActor: vi.fn(),
  getProfile: vi.fn(),
  listPosts: vi.fn(),
}));

vi.mock("@/modules/identity/infrastructure/current-actor", () => ({ getCurrentActor }));
vi.mock("@/modules/identity/application/manage-student-profile", () => ({
  StudentProfileService: class { get = getProfile; },
}));
vi.mock("@/modules/student-team/application/manage-student-team-recruitment", () => ({
  StudentTeamRecruitmentQueryService: class { listPosts = listPosts; },
}));
vi.mock("@/modules/identity/infrastructure/prisma-student-profile-repository", () => ({
  PrismaStudentProfileRepository: class {},
}));
vi.mock("@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository", () => ({
  PrismaStudentTeamRecruitmentQueryRepository: class {},
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock("@/app/_components/app-shell", () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/modules/student-team/ui/student-team-section-layout", () => ({
  StudentTeamSectionLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
  StudentTeamPageIntro: ({ title, description, meta }: { title: string; description: string; meta?: ReactNode }) => <header><h1>{title}</h1><p>{description}</p><div>{meta}</div></header>,
  StudentTeamPagination: () => null,
}));
vi.mock("@/app/recruitments/_components/recruitment-post-list", () => ({
  RecruitmentPostList: () => <div>모집 카드</div>,
}));

describe("RecruitmentsPage", () => {
  it("제목과 설명, 모집 수를 상단 소개 한 곳에서만 제공한다", async () => {
    getCurrentActor.mockResolvedValue({ id: "student-1", name: "정하늘", role: "STUDENT" });
    getProfile.mockResolvedValue(null);
    listPosts.mockResolvedValue({ posts: [], page: 1, totalPages: 1, total: 3 });

    render(await RecruitmentsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "팀 찾기" })).toBeInTheDocument();
    expect(screen.getByText("모집 중인 팀 3개")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "팀원 모집" })).not.toBeInTheDocument();
    expect(screen.queryByText("필요한 역할과 기술, 활동 가능 시간을 비교할 수 있습니다.")).not.toBeInTheDocument();
  });
});
