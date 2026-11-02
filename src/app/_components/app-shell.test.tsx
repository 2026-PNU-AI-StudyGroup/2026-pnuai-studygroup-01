import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { accountPopoverPropsMock, findUniqueMock, projectAssistantCountMock, redirectMock } = vi.hoisted(() => ({
  accountPopoverPropsMock: vi.fn(),
  findUniqueMock: vi.fn(),
  projectAssistantCountMock: vi.fn(async () => 0),
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

// 껍데기는 사이드바 접힘과 밝기를 쿠키에서 읽는다. 요청 없이 부르는 검사에서는 빈 쿠키로 둔다.
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

vi.mock("@/app/_actions/notification-actions", () => ({
  openNotificationAction: vi.fn(),
}));
vi.mock("@/app/_actions/language-actions", () => ({
  updateLanguageAction: vi.fn(),
}));
// 팝업 공지는 껍데기 메뉴 검사와 상관없다. 공지 조회까지 흉내 내지 않는다.
vi.mock("@/app/_components/popup-announcements", () => ({
  PopupAnnouncements: () => null,
}));
vi.mock("@/app/_components/notification-indicator-container", () => ({
  NotificationIndicatorContainer: () => <a href="/notifications">알림함</a>,
}));
vi.mock("@/modules/translation/infrastructure/user-locale", () => ({
  getUserLocale: vi.fn(async () => "ko"),
}));
vi.mock("@/modules/translation/ui/language-popover", () => ({
  LanguagePopover: ({ placement }: { placement?: string }) => <button>언어{placement === "below" ? " 모바일" : ""}</button>,
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
    storedTranslation: {
      findMany: vi.fn(async () => []),
    },
    projectAssistant: {
      count: projectAssistantCountMock,
    },
  },
}));
vi.mock("@/modules/identity/ui/account-popover", () => ({
  AccountPopover: ({ userName, active, accountPageCurrent, placement }: { userName: string; active: boolean; accountPageCurrent: boolean; placement?: string }) => {
    accountPopoverPropsMock({ active, accountPageCurrent, placement });
    const label = `${userName} 내 계정`;
    return accountPageCurrent
      ? <span aria-current="page">{label}</span>
      : <a href="/account" aria-current={active ? "page" : undefined}>{label}</a>;
  },
}));

import { AppShell } from "@/app/_components/app-shell";

// 위 막대 경로에도 같은 이름의 링크가 생긴다. 메뉴 검사는 메뉴 안에서만 찾는다.
const primary = () => within(screen.getByRole("navigation", { name: "주요 메뉴" }));
const mobile = () => within(screen.getByRole("navigation", { name: "모바일 주요 메뉴" }));

describe("AppShell", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    accountPopoverPropsMock.mockReset();
    findUniqueMock.mockReset();
    projectAssistantCountMock.mockReset();
    projectAssistantCountMock.mockResolvedValue(0);
    findUniqueMock.mockResolvedValue({
      onboardingRequired: false,
      onboardingCompletedAt: null,
    });
  });

  it("가입 정보가 필요한 신규 학생은 온보딩으로 보낸다", async () => {
    findUniqueMock.mockResolvedValue({
      onboardingRequired: true,
      onboardingCompletedAt: null,
    });

    await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/topics", preferredLocale: "ko", children: <p>본문</p> });

    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("학생에게 학생용 메뉴만 제공한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/topics", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "프로젝트 찾기" })).toHaveLength(2);
    expect(primary().getByRole("link", { name: "프로젝트 찾기" })).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "부산대학교 학과 프로젝트 찾기" })).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "테스트 내 계정" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "본문으로 건너뛰기" })).toHaveAttribute("href", "#main-content");
    expect(screen.queryByRole("link", { name: "지원 검토" })).not.toBeInTheDocument();
    expect(primary().getByRole("link", { name: "프로젝트 찾기" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "지난 프로젝트" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "내 지원" })).not.toBeInTheDocument();
    expect(primary().getByRole("link", { name: "내 프로젝트" })).toHaveAttribute("href", "/dashboard");
    expect(primary().getByRole("link", { name: "팀 모집" })).toHaveAttribute("href", "/recruitments");
    expect(primary().getByRole("link", { name: "공지사항" })).toHaveAttribute("href", "/announcements");
  });

  it("학생 조교에게 프로젝트 운영 메뉴를 제공한다", async () => {
    projectAssistantCountMock.mockResolvedValue(1);

    render(await AppShell({
      role: "STUDENT",
      userId: "assistant-1",
      userName: "학생 조교",
      currentPath: "/professor/topics",
      preferredLocale: "ko",
      children: <p>본문</p>,
    }));

    const links = screen.getAllByRole("link", { name: "조교 관리" });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/professor/topics");
    expect(links[0]).toHaveAttribute("aria-current", "page");
  });

  it("학생 프로젝트 등록과 승인 요청을 내 프로젝트 흐름으로 표시한다", async () => {
    const firstRender = render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/topics", preferredLocale: "ko", children: <p>본문</p> }));

    expect(primary().getByRole("link", { name: "프로젝트 찾기" })).toHaveAttribute("aria-current", "page");
    expect(primary().getByRole("link", { name: "내 프로젝트" })).not.toHaveAttribute("aria-current");

    firstRender.unmount();
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/dashboard", preferredLocale: "ko", children: <p>본문</p> }));

    expect(primary().getByRole("link", { name: "내 프로젝트" })).toHaveAttribute("aria-current", "page");
  });

  it("팀원 모집 하위 화면에서 팀 모집 메뉴를 현재 영역으로 유지한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/recruitments/applications", preferredLocale: "ko", children: <p>본문</p> }));

    expect(primary().getByRole("link", { name: "팀 모집" })).toHaveAttribute("aria-current", "page");
    expect(mobile().getByRole("link", { name: "팀 모집" })).toHaveAttribute("aria-current", "page");
    expect(primary().getByRole("link", { name: "팀 모집" })).toHaveAttribute("href", "/recruitments");
    expect(primary().getByRole("link", { name: "내 프로젝트" })).not.toHaveAttribute("aria-current");
  });

  it("팀 관리 하위 화면에서도 팀 모집 메뉴를 현재 영역으로 유지한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/teams/manage/team-1", preferredLocale: "ko", children: <p>본문</p> }));

    expect(primary().getByRole("link", { name: "팀 모집" })).toHaveAttribute("aria-current", "page");
    expect(primary().getByRole("link", { name: "팀 모집" })).toHaveAttribute("href", "/recruitments");
  });

  it("영문 환경에서도 팀 관리 화면을 Recruit 영역으로 묶는다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "Test", currentPath: "/teams/manage/team-1", preferredLocale: "en", children: <p>Content</p> }));

    expect(within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("link", { name: "Recruit" })).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("link", { name: "Recruit" })).toHaveAttribute("href", "/recruitments");
  });

  it("프로필 편집 화면에서도 내 계정을 현재 위치로 표시한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/account/profile", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getByRole("link", { name: "테스트 내 계정" })).toHaveAttribute("aria-current", "page");
    expect(accountPopoverPropsMock).toHaveBeenCalledWith(expect.objectContaining({ accountPageCurrent: false }));
  });

  it("정확히 계정 화면일 때만 팝오버에 현재 목적지 계약을 전달한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/account", preferredLocale: "ko", children: <p>본문</p> }));

    // 휴대폰과 넓은 화면이 위 막대 하나를 같이 쓴다. 계정 메뉴도 한 번만 그린다.
    expect(accountPopoverPropsMock).toHaveBeenCalledTimes(1);
    expect(accountPopoverPropsMock.mock.calls.every(([props]) => props.accountPageCurrent === true)).toBe(true);
    expect(screen.queryByRole("link", { name: "테스트 내 계정" })).not.toBeInTheDocument();
  });

  it("모든 역할의 공개 프로그램 진입점을 주제 탐색으로 통합한다", async () => {
    render(await AppShell({ role: "PROFESSOR", userId: "professor-1", userName: "테스트", currentPath: "/topics", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "프로젝트 찾기" })).toHaveLength(2);
    expect(primary().getByRole("link", { name: "프로젝트 찾기" })).toHaveAttribute("href", "/topics");
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
  });

  it("관리자에게만 프로젝트 승인 전역 메뉴를 제공한다", async () => {
    render(await AppShell({ role: "ADMIN", userId: "admin-1", userName: "테스트", currentPath: "/project-approvals", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "프로젝트 승인" })).toHaveLength(2);
    expect(primary().getByRole("link", { name: "프로젝트 승인" })).toHaveAttribute("href", "/project-approvals");
    expect(primary().getByRole("link", { name: "프로젝트 승인" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "운영 관리" })).toHaveLength(2);
    expect(primary().getByRole("link", { name: "운영 관리" })).toHaveAttribute("href", "/admin/professors");
    expect(primary().getByRole("link", { name: "운영 관리" })).not.toHaveAttribute("aria-current");
    expect(screen.getAllByRole("link", { name: "공지사항" })).toHaveLength(2);
    expect([...screen.getByRole("navigation", { name: "주요 메뉴" }).querySelectorAll("a")].map((link) => link.textContent)).toEqual([
      "프로젝트 현황",
      "프로젝트 승인",
      "공지사항",
      "운영 관리",
    ]);
    expect(screen.queryByRole("link", { name: "운영 학기" })).not.toBeInTheDocument();
    // 주요 메뉴, 위 막대 경로, 휴대폰 아래 탭.
    expect(screen.getAllByRole("navigation")).toHaveLength(3);
  });

  it("위 막대 경로에 현재 영역과 화면이 덧붙인 칸을 잇는다", async () => {
    render(await AppShell({
      role: "STUDENT",
      userId: "student-1",
      userName: "테스트",
      currentPath: "/topics/topic-1",
      preferredLocale: "ko",
      crumbs: [{ label: "해커톤", href: "/topics?programId=program-1" }, { label: "번역 도구" }],
      panel: <nav aria-label="프로그램 선택">프로그램 목록</nav>,
      children: <p>본문</p>,
    }));

    const trail = within(screen.getByRole("navigation", { name: "현재 위치" }));
    expect(trail.getByRole("link", { name: "프로젝트 찾기" })).toHaveAttribute("href", "/topics");
    expect(trail.getByRole("link", { name: "해커톤" })).toHaveAttribute("href", "/topics?programId=program-1");
    expect(trail.getByText("번역 도구")).toHaveAttribute("aria-current", "page");
    // 화면별 목록은 왼쪽 메뉴 칸 안, 주요 메뉴 뒤에 놓인다.
    const sidebar = screen.getByRole("complementary");
    expect(within(sidebar).getByRole("navigation", { name: "프로그램 선택" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "주요 메뉴" }).compareDocumentPosition(screen.getByRole("navigation", { name: "프로그램 선택" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("현재 영역이 곧 지금 화면이면 경로 칸을 링크로 두지 않는다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/topics", preferredLocale: "ko", children: <p>본문</p> }));

    const trail = within(screen.getByRole("navigation", { name: "현재 위치" }));
    expect(trail.queryByRole("link")).not.toBeInTheDocument();
    expect(trail.getByText("프로젝트 찾기")).toHaveAttribute("aria-current", "page");
  });

  it("관리자 업무 화면에서는 운영 관리만 현재 메뉴로 표시한다", async () => {
    render(await AppShell({ role: "ADMIN", userId: "admin-1", userName: "테스트", currentPath: "/admin/users", preferredLocale: "ko", children: <p>본문</p> }));

    expect(primary().getByRole("link", { name: "운영 관리" })).toHaveAttribute("aria-current", "page");
  });

  it("프로그램 관리 경로에서는 프로젝트 현황 문맥을 유지한다", async () => {
    render(await AppShell({ role: "ADMIN", userId: "admin-1", userName: "테스트", currentPath: "/topics/manage/program-1/reports", preferredLocale: "ko", children: <p>본문</p> }));

    expect(primary().getByRole("link", { name: "프로젝트 현황" })).toHaveAttribute("aria-current", "page");
    expect(primary().getByRole("link", { name: "운영 관리" })).not.toHaveAttribute("aria-current");
  });

  it("관리자가 교수 프로젝트 관리 화면을 열어도 운영 관리 문맥을 유지한다", async () => {
    render(await AppShell({ role: "ADMIN", userId: "admin-1", userName: "테스트", currentPath: "/professor/topics", preferredLocale: "ko", children: <p>본문</p> }));

    expect(primary().getByRole("link", { name: "운영 관리" })).toHaveAttribute("aria-current", "page");
  });
});
