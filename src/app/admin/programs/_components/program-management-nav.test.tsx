import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgramManagementNav } from "@/app/admin/programs/_components/program-management-nav";

describe("ProgramManagementNav", () => {
  it("프로그램 상세의 네 관리 영역을 링크 탭으로 제공한다", () => {
    render(<ProgramManagementNav programId="program-1" current="divisions" />);

    expect(screen.getByRole("navigation", { name: "프로그램 관리 메뉴" })).toHaveClass("overflow-x-auto");
    expect(screen.getByRole("link", { name: "설정" })).toHaveAttribute("href", "/admin/programs/program-1/settings");
    expect(screen.getByRole("link", { name: "분과" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "투표" })).toHaveAttribute("href", "/admin/programs/program-1/votes");
    expect(screen.getByRole("link", { name: "채점표" })).toHaveAttribute("href", "/admin/programs/program-1/rubric");
  });
});
