import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminWorkspace } from "@/app/_components/admin-workspace";

describe("AdminWorkspace", () => {
  it("관리자 업무를 2차 사이드바와 현재 메뉴 선택 상태로 제공한다", () => {
    const { container } = render(
      <AdminWorkspace
        currentPath="/admin/users"
        eyebrow="사용자 · 계정 관리"
        title="사용자"
        description="가입 계정을 관리합니다."
      >
        <p>관리 화면 본문</p>
      </AdminWorkspace>,
    );

    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "사용자" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "프로젝트 승인" })).not.toBeInTheDocument();
    expect(screen.getByText("사용자 · 계정 관리")).toBeInTheDocument();
    expect(screen.getByText("관리 화면 본문")).toBeInTheDocument();
    expect(container.querySelector("main > div")).toHaveClass("xl:grid-cols-[17rem_minmax(0,1fr)]");
  });

  it("eyebrow와 설명 없이 제목만 제공할 수 있다", () => {
    const { container } = render(
      <AdminWorkspace currentPath="/admin/users" title="사용자">
        <p>관리 화면 본문</p>
      </AdminWorkspace>,
    );

    const header = container.querySelector("header");
    expect(header).toHaveTextContent("사용자");
    expect(header?.querySelector("p")).not.toBeInTheDocument();
  });
});
