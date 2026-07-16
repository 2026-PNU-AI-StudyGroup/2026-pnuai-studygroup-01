import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/shared/ui/app-shell";

describe("AppShell", () => {
  it("학생에게 학생용 메뉴만 제공한다", () => {
    render(<AppShell role="STUDENT" userName="테스트" currentPath="/topics"><p>본문</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "부산대학교 학과 프로젝트 탐색" })).toHaveAttribute("href", "/topics");
    expect(screen.getByRole("link", { name: "테스트 계정 정보" })).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("link", { name: "지원 검토" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "지난 프로젝트" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
  });

  it("모든 역할의 공개 프로그램 진입점을 주제 탐색으로 통합한다", () => {
    render(<AppShell role="PROFESSOR" userName="테스트" currentPath="/topics"><p>본문</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "프로젝트 탐색" })[0]).toHaveAttribute("href", "/topics");
    expect(screen.queryByRole("link", { name: "프로그램" })).not.toBeInTheDocument();
  });

  it("관리자 전역 메뉴를 세 개로 제한하고 관리 화면에서만 세부 메뉴를 제공한다", () => {
    render(<AppShell role="ADMIN" userName="테스트" currentPath="/admin/academic-cycles"><p>본문</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "관리" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "학기" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("navigation")).toHaveLength(3);
  });
});
