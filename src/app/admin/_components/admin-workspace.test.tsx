import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminWorkspace } from "@/app/_components/admin-workspace";

describe("AdminWorkspace", () => {
  it("관리자 업무를 2차 사이드바와 현재 메뉴 선택 상태로 제공한다", () => {
    const { container } = render(
      <AdminWorkspace
        currentPath="/admin/programs/new"
        eyebrow="프로그램 · 새로 만들기"
        title="새 프로그램"
        description="새 프로그램을 등록합니다."
      >
        <p>관리 화면 본문</p>
      </AdminWorkspace>,
    );

    expect(screen.getByRole("complementary")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "프로그램개설과 공개 상태" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("프로그램 · 새로 만들기")).toBeInTheDocument();
    expect(screen.getByText("관리 화면 본문")).toBeInTheDocument();
    expect(container.querySelector("main > div")).toHaveClass("xl:grid-cols-[17rem_minmax(0,1fr)]");
  });
});
