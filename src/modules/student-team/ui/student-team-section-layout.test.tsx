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
    expect(navigation).toHaveTextContent("팀원 모집팀 관리지원 내역내 모집");
    expect(within(navigation).getByRole("link", { name: "팀원 모집" })).toHaveAttribute("aria-current", "page");
    const summaries = container.querySelectorAll("summary");
    expect(summaries[0]).toHaveTextContent("팀 꾸리기"); // 영역 전환 드롭다운
    expect(summaries[1]).toHaveTextContent("팀팀원 모집"); // 섹션 모바일 요약
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
