import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminProjectOperationsSummary } from "@/app/topics/_components/admin-project-operations-summary";

describe("AdminProjectOperationsSummary", () => {
  it("숫자 칸이 곧 목록 조건이고, 고른 칸을 다시 누르면 그 조건만 풀린다", () => {
    render(
      <AdminProjectOperationsSummary
        programId="program-1"
        operations={{
          summary: { total: 4, formed: 3, unassigned: 1, overdue: 1, submitted: 1 },
          matchingTopicIds: ["topic-2", "topic-3"],
        }}
        selectedTeamFilter="formed"
        selectedReportFilter="overdue"
        showTeamFilter
        divisionId="division-1"
        query="길찾기"
      />,
    );

    expect(screen.getByRole("navigation", { name: "프로젝트 조건" })).toBeInTheDocument();
    const overdue = screen.getByRole("link", { name: "보고서 기한 초과 1개" });
    expect(overdue).toHaveAttribute("aria-current", "page");
    expect(overdue).toHaveAttribute(
      "href",
      "/topics?programId=program-1&divisionId=division-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0&teamStatus=formed",
    );
    expect(screen.getByRole("link", { name: "팀 미구성 1개" })).toHaveAttribute(
      "href",
      "/topics?programId=program-1&divisionId=division-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0&teamStatus=unassigned&reportStatus=overdue",
    );
    expect(screen.getByRole("link", { name: "전체 프로젝트 4개" })).toHaveAttribute(
      "href",
      "/topics?programId=program-1&divisionId=division-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0",
    );
    // 기한을 넘긴 수만 빨갛게 둔다.
    expect(overdue.querySelector(".text-\\[var\\(--danger\\)\\]")).toHaveTextContent("1");
  });

  it("학생 팀 프로젝트 등록형에서는 팀 구성 칸을 두지 않는다", () => {
    render(
      <AdminProjectOperationsSummary
        programId="program-1"
        operations={{ summary: { total: 1, formed: 1, unassigned: 0, overdue: 0, submitted: 1 }, matchingTopicIds: ["topic-1"] }}
        selectedTeamFilter="all"
        selectedReportFilter="all"
        showTeamFilter={false}
        query=""
      />,
    );

    expect(screen.queryByRole("link", { name: /^팀 구성됨/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "보고서 모두 제출 1개" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "전체 프로젝트 1개" })).toHaveAttribute("aria-current", "page");
  });
});
