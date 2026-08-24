import { render, screen } from "@testing-library/react";
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
    const label = `${userName} 내 계정${placement === "below" ? " 모바일" : ""}`;
    return accountPageCurrent
      ? <span aria-current="page">{label}</span>
      : <a href="/account" aria-current={active ? "page" : undefined}>{label}</a>;
  },
}));

import { AppShell } from "@/app/_components/app-shell";

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
    expect(screen.getAllByRole("link", { name: "프로젝트 찾기" })[0]).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "부산대학교 학과 프로젝트 찾기" })).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "테스트 내 계정" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "본문으로 건너뛰기" })).toHaveAttribute("href", "#main-content");
    expect(screen.queryByRole("link", { name: "지원 검토" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "프로젝트 찾기" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "지난 프로젝트" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "내 지원" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "내 프로젝트" })[0]).toHaveAttribute("href", "/dashboard");
    expect(screen.getAllByRole("link", { name: "팀 모집" })[0]).toHaveAttribute("href", "/recruitments");
    expect(screen.getAllByRole("link", { name: "공지사항" })[0]).toHaveAttribute("href", "/announcements");
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

    expect(screen.getAllByRole("link", { name: "프로젝트 찾기" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "내 프로젝트" })[0]).not.toHaveAttribute("aria-current");

    firstRender.unmount();
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/dashboard", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "내 프로젝트" })[0]).toHaveAttribute("aria-current", "page");
  });

  it("팀원 모집 하위 화면에서 팀 모집 메뉴를 현재 영역으로 유지한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/recruitments/applications", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "팀 모집" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "팀 모집" })[1]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "팀 모집" })[0]).toHaveAttribute("href", "/recruitments");
    expect(screen.getAllByRole("link", { name: "내 프로젝트" })[0]).not.toHaveAttribute("aria-current");
  });

  it("팀 관리 하위 화면에서도 팀 모집 메뉴를 현재 영역으로 유지한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/teams/manage/team-1", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "팀 모집" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "팀 모집" })[0]).toHaveAttribute("href", "/recruitments");
  });

  it("영문 환경에서도 팀 관리 화면을 Recruit 영역으로 묶는다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "Test", currentPath: "/teams/manage/team-1", preferredLocale: "en", children: <p>Content</p> }));

    expect(screen.getAllByRole("link", { name: "Recruit" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "Recruit" })[0]).toHaveAttribute("href", "/recruitments");
  });

  it("프로필 편집 화면에서도 내 계정을 현재 위치로 표시한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/account/profile", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getByRole("link", { name: "테스트 내 계정" })).toHaveAttribute("aria-current", "page");
    expect(accountPopoverPropsMock).toHaveBeenCalledWith(expect.objectContaining({ accountPageCurrent: false }));
  });

  it("정확히 계정 화면일 때만 팝오버에 현재 목적지 계약을 전달한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/account", preferredLocale: "ko", children: <p>본문</p> }));

    expect(accountPopoverPropsMock).toHaveBeenCalledTimes(2);
    expect(accountPopoverPropsMock.mock.calls.every(([props]) => props.accountPageCurrent === true)).toBe(true);
    expect(screen.queryByRole("link", { name: "테스트 내 계정" })).not.toBeInTheDocument();
  });

  it("모든 역할의 공개 프로그램 진입점을 주제 탐색으로 통합한다", async () => {
    render(await AppShell({ role: "PROFESSOR", userId: "professor-1", userName: "테스트", currentPath: "/topics", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "프로젝트 찾기" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "프로젝트 찾기" })[0]).toHaveAttribute("href", "/topics");
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
  });

  it("관리자에게만 프로젝트 승인 전역 메뉴를 제공한다", async () => {
    render(await AppShell({ role: "ADMIN", userId: "admin-1", userName: "테스트", currentPath: "/project-approvals", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "프로젝트 승인" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "프로젝트 승인" })[0]).toHaveAttribute("href", "/project-approvals");
    expect(screen.getAllByRole("link", { name: "프로젝트 승인" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "운영 관리" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "운영 관리" })[0]).toHaveAttribute("href", "/admin/professors");
    expect(screen.getAllByRole("link", { name: "운영 관리" })[0]).not.toHaveAttribute("aria-current");
    expect(screen.getAllByRole("link", { name: "공지사항" })).toHaveLength(2);
    expect([...screen.getByRole("navigation", { name: "주요 메뉴" }).querySelectorAll("a")].map((link) => link.textContent)).toEqual([
      "프로젝트 현황",
      "프로젝트 승인",
      "공지사항",
      "운영 관리",
    ]);
    expect(screen.queryByRole("link", { name: "운영 학기" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("navigation")).toHaveLength(2);
  });

  it("관리자 업무 화면에서는 운영 관리만 현재 메뉴로 표시한다", async () => {
    render(await AppShell({ role: "ADMIN", userId: "admin-1", userName: "테스트", currentPath: "/admin/users", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "운영 관리" })[0]).toHaveAttribute("aria-current", "page");
  });

  it("프로그램 관리 경로에서는 프로젝트 현황 문맥을 유지한다", async () => {
    render(await AppShell({ role: "ADMIN", userId: "admin-1", userName: "테스트", currentPath: "/topics/manage/program-1/reports", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "프로젝트 현황" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "운영 관리" })[0]).not.toHaveAttribute("aria-current");
  });

  it("관리자가 교수 프로젝트 관리 화면을 열어도 운영 관리 문맥을 유지한다", async () => {
    render(await AppShell({ role: "ADMIN", userId: "admin-1", userName: "테스트", currentPath: "/professor/topics", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "운영 관리" })[0]).toHaveAttribute("aria-current", "page");
  });
});
