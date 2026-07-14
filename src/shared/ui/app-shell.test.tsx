import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/shared/ui/app-shell";

describe("AppShell", () => {
  it("학생에게 학생용 메뉴만 제공한다", () => {
    render(<AppShell role="STUDENT" userName="테스트" currentPath="/topics"><p>본문</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "주제 탐색" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "지원 검토" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "주제 탐색" })[0]).toHaveAttribute("aria-current", "page");
  });

  it("관리자에게 학기 관리 메뉴를 제공한다", () => {
    render(<AppShell role="ADMIN" userName="테스트" currentPath="/admin/academic-cycles"><p>본문</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "학기 관리" })).toHaveLength(2);
  });
});
