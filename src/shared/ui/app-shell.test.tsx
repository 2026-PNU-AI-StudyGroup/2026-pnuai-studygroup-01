import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/notification/ui/notification-indicator", () => ({
  NotificationIndicator: () => <a href="/notifications">알림함</a>,
}));

import { AppShell } from "@/shared/ui/app-shell";

describe("AppShell", () => {
  it("학생에게 학생용 메뉴만 제공한다", () => {
    render(<AppShell role="STUDENT" userId="student-1" userName="테스트" currentPath="/topics"><p>본문</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "부산대학교 학과 프로젝트 탐색" })).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "테스트 마이페이지" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "본문으로 건너뛰기" })).toHaveAttribute("href", "#main-content");
    expect(screen.queryByRole("link", { name: "지원 검토" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "지난 프로젝트" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
  });

  it("학생 지원 이력에서는 내 지원 메뉴만 현재 위치로 표시한다", () => {
    render(<AppShell role="STUDENT" userId="student-1" userName="테스트" currentPath="/topics/applications"><p>본문</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "내 지원" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).not.toHaveAttribute("aria-current");
  });

  it("모든 역할의 공개 프로그램 진입점을 주제 탐색으로 통합한다", () => {
    render(<AppShell role="PROFESSOR" userId="professor-1" userName="테스트" currentPath="/topics"><p>본문</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).toHaveAttribute("href", "/topics");
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
  });

  it("관리자 전역 메뉴를 세 개로 제한하고 관리 화면에서만 세부 메뉴를 제공한다", () => {
    render(<AppShell role="ADMIN" userId="admin-1" userName="테스트" currentPath="/admin/academic-cycles"><p>본문</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "관리" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "학기" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("navigation")).toHaveLength(3);
  });
});
