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
  StudentTeamPanel: () => null,
  StudentTeamPageIntro: ({ title, finding, action }: { title: string; finding?: ReactNode; action?: ReactNode }) => <header><h1>{title}</h1><p data-testid="finding">{finding}</p>{action}</header>,
  StudentTeamPagination: () => null,
}));
vi.mock("@/app/recruitments/_lib/recruit-members-entry", () => ({
  recruitMembersEntry: async () => ({ href: "/teams/manage/team-1?modal=recruitment", label: "팀원 모집하기" }),
}));
vi.mock("@/app/recruitments/_components/recruitment-post-list", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/app/recruitments/_components/recruitment-post-list")>(),
  RecruitmentPostList: () => <div>모집 목록</div>,
}));

const day = 86_400_000;
function post(id: string, overrides: Record<string, unknown>) {
  return {
    id, teamId: `team-${id}`, teamName: `팀 ${id}`, topicTitle: "", authorId: "student-2", authorName: "김하늘",
    title: `공고 ${id}`, content: "", requiredSkills: [], roleNeeded: "", availability: "",
    memberCount: 2, capacity: 4, createdAt: new Date(), deadlineAt: new Date(Date.now() + 9 * day),
    canApply: true, isMember: false, ownApplication: null,
    ...overrides,
  };
}

describe("RecruitmentsPage", () => {
  it("제목 아래 한 줄에 지금 지원할 수 있는 공고 수와 가장 먼저 닫히는 공고를 적는다", async () => {
    getCurrentActor.mockResolvedValue({ id: "student-1", name: "정하늘", role: "STUDENT" });
    getProfile.mockResolvedValue(null);
    listPosts.mockResolvedValue({
      page: 1,
      totalPages: 1,
      total: 4,
      posts: [
        post("a", { deadlineAt: new Date(Date.now() + 9 * day) }),
        post("b", { teamName: "모두의 길", deadlineAt: new Date(Date.now() + 3 * day + 3_600_000) }),
        // 내 공고, 이미 지원한 공고는 지원할 수 있는 수에서 빠진다.
        post("c", { authorId: "student-1", deadlineAt: new Date(Date.now() + day) }),
        post("d", { ownApplication: { status: "PENDING" } }),
      ],
    });

    render(await RecruitmentsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getAllByRole("heading", { name: "둘러보기" })).toHaveLength(1);
    const finding = screen.getByTestId("finding");
    expect(finding).toHaveTextContent("지금 지원할 수 있는 공고 2건");
    expect(finding).toHaveTextContent(/모두의 길 공고가 [34]일 뒤 가장 먼저 마감됩니다/);
    expect(finding).toHaveTextContent("내 지원 1건은 팀장이 검토하고 있습니다.");
    expect(screen.getByRole("link", { name: "팀원 모집하기" })).toHaveAttribute("href", "/teams/manage/team-1?modal=recruitment");
  });
});
