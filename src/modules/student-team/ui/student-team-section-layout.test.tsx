import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudentTeamPanel } from "@/modules/student-team/ui/student-team-section-layout";

describe("StudentTeamPanel", () => {
  it("팀 관련 화면을 동일한 보조 사이드바에 둔다", () => {
    const { container } = render(
      <StudentTeamPanel currentPath="/recruitments" />,
    );

    const navigation = screen.getByRole("navigation", { name: "팀 메뉴" });
    expect(navigation).toHaveTextContent("둘러보기내 팀받은 지원지원 내역");
    expect(within(navigation).getByRole("link", { name: "둘러보기" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector("summary")).toHaveTextContent("팀 모집둘러보기");
  });

  it("내 팀 탭이 팀 관리 경로를 포함하고 받은 지원은 독립 진입점이다", () => {
    render(
      <StudentTeamPanel currentPath="/teams/manage/team-1" />,
    );
    expect(within(screen.getByRole("navigation", { name: "팀 메뉴" })).getByRole("link", { name: "내 팀" })).toHaveAttribute("aria-current", "page");

    render(
      <StudentTeamPanel currentPath="/recruitments/mine" />,
    );
    const navs = screen.getAllByRole("navigation", { name: "팀 메뉴" });
    expect(within(navs[navs.length - 1]).getByRole("link", { name: "내 팀" })).toHaveAttribute("aria-current", "page");

    render(
      <StudentTeamPanel currentPath="/recruitments/received" />,
    );
    const receivedNavs = screen.getAllByRole("navigation", { name: "팀 메뉴" });
    expect(within(receivedNavs[receivedNavs.length - 1]).getByRole("link", { name: "받은 지원" })).toHaveAttribute("aria-current", "page");
  });
});
