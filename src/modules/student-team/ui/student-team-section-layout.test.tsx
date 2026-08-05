import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudentTeamSectionLayout } from "@/modules/student-team/ui/student-team-section-layout";

describe("StudentTeamSectionLayout", () => {
  it("팀 관련 화면을 동일한 보조 사이드바에 둔다", () => {
    const { container } = render(
      <StudentTeamSectionLayout currentPath="/recruitments">
        <p>본문</p>
      </StudentTeamSectionLayout>,
    );

    const navigation = screen.getByRole("navigation", { name: "팀 메뉴" });
    expect(navigation).toHaveTextContent("팀 찾기팀 관리지원 상태내 공고");
    expect(within(navigation).getByRole("link", { name: "팀 찾기" })).toHaveAttribute("aria-current", "page");
    expect(container.querySelector("summary")).toHaveTextContent("팀팀 찾기");
  });

  it("개별 팀 관리에서도 팀 관리 탭을 유지한다", () => {
    render(
      <StudentTeamSectionLayout currentPath="/teams/manage/team-1">
        <p>본문</p>
      </StudentTeamSectionLayout>,
    );

    const navigation = screen.getByRole("navigation", { name: "팀 메뉴" });
    expect(within(navigation).getByRole("link", { name: "팀 관리" })).toHaveAttribute("aria-current", "page");
  });
});
