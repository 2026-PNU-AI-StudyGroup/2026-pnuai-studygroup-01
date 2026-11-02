import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminSidebar } from "@/app/_components/admin-sidebar";
import { AdminWorkspace } from "@/app/_components/admin-workspace";

describe("AdminWorkspace", () => {
  it("관리 화면 머리말과 본문을 제공한다", () => {
    render(
      <AdminWorkspace
        eyebrow="사용자 · 계정 관리"
        title="사용자"
        description="가입 계정을 관리합니다."
      >
        <p>관리 화면 본문</p>
      </AdminWorkspace>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "사용자" })).toBeInTheDocument();
    expect(screen.getByText("사용자 · 계정 관리")).toBeInTheDocument();
    expect(screen.getByText("관리 화면 본문")).toBeInTheDocument();
    // 업무 목록은 AppShell 의 왼쪽 메뉴 칸으로 옮겼다. 본문 칸에는 다시 그리지 않는다.
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("eyebrow와 설명 없이 제목만 제공할 수 있다", () => {
    const { container } = render(
      <AdminWorkspace title="사용자">
        <p>관리 화면 본문</p>
      </AdminWorkspace>,
    );

    const header = container.querySelector("header");
    expect(header).toHaveTextContent("사용자");
    expect(header?.querySelector("p")).not.toBeInTheDocument();
  });
});

describe("AdminSidebar", () => {
  it("관리자 업무 목록에 현재 메뉴를 표시한다", () => {
    render(<AdminSidebar currentPath="/admin/users" />);

    const navigation = screen.getByRole("navigation", { name: "관리자 업무" });
    for (const link of within(navigation).getAllByRole("link", { name: /^사용자/ })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    expect(within(navigation).queryByRole("link", { name: "프로젝트 승인" })).not.toBeInTheDocument();
  });
});
