import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, redirectMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
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
  },
}));
vi.mock("@/modules/identity/ui/account-popover", () => ({
  AccountPopover: ({ userName, active, placement }: { userName: string; active: boolean; placement?: string }) => (
    <a href="/account" aria-current={active ? "page" : undefined}>{userName} 내 계정{placement === "below" ? " 모바일" : ""}</a>
  ),
}));

import { AppShell } from "@/app/_components/app-shell";

describe("AppShell", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    findUniqueMock.mockReset();
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

    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "부산대학교 학과 프로젝트 탐색" })).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "테스트 내 계정" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "본문으로 건너뛰기" })).toHaveAttribute("href", "#main-content");
    expect(screen.queryByRole("link", { name: "지원 검토" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "지난 프로젝트" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "내 지원" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "내 프로젝트" })[0]).toHaveAttribute("href", "/dashboard");
  });

  it("학생 프로젝트 화면에서는 통합된 내 프로젝트 메뉴를 현재 위치로 표시한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/dashboard", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "내 프로젝트" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).not.toHaveAttribute("aria-current");
  });

  it("팀 찾기에서도 전역 팀 관리 메뉴를 현재 영역으로 유지한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/recruitments", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "팀 관리" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "팀 관리" })[1]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "팀 관리" })[0]).toHaveAttribute("href", "/recruitments");
  });

  it("내 팀 관리 화면에서도 전역 팀 관리 메뉴를 현재 영역으로 유지한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/teams", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "팀 관리" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "팀 관리" })[0]).toHaveAttribute("href", "/recruitments");
  });

  it("프로필 편집 화면에서도 내 계정을 현재 위치로 표시한다", async () => {
    render(await AppShell({ role: "STUDENT", userId: "student-1", userName: "테스트", currentPath: "/account/profile", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getByRole("link", { name: "테스트 내 계정" })).toHaveAttribute("aria-current", "page");
  });

  it("모든 역할의 공개 프로그램 진입점을 주제 탐색으로 통합한다", async () => {
    render(await AppShell({ role: "PROFESSOR", userId: "professor-1", userName: "테스트", currentPath: "/topics", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).toHaveAttribute("href", "/topics");
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
  });

  it("관리자 전역 메뉴를 세 개로 제한하고 세부 관리는 화면 내부 내비게이션에 맡긴다", async () => {
    render(await AppShell({ role: "ADMIN", userId: "admin-1", userName: "테스트", currentPath: "/admin/academic-cycles", preferredLocale: "ko", children: <p>본문</p> }));

    expect(screen.getAllByRole("link", { name: "관리" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "학기" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("navigation")).toHaveLength(2);
  });
});
