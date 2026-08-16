import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminProjectOperationsSummary } from "@/app/topics/_components/admin-project-operations-summary";

describe("AdminProjectOperationsSummary", () => {
  it("프로그램 전체 집계를 보여주고 선택한 상태로 같은 목록을 필터링한다", () => {
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

    expect(screen.getByRole("heading", { name: "프로젝트 필터" })).toHaveClass("sr-only");
    expect(screen.getByRole("link", { name: "기한 초과 1개" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "기한 초과 1개" })).toHaveAttribute(
      "href",
      "/topics?programId=program-1&divisionId=division-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0&teamStatus=formed&reportStatus=overdue",
    );
    expect(screen.getAllByRole("link", { name: "전체 4개" })[0]).toHaveAttribute(
      "href",
      "/topics?programId=program-1&divisionId=division-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0&reportStatus=overdue",
    );
  });

  it("학생 팀 프로젝트 등록형에서는 팀 구성 조건을 표시하지 않는다", () => {
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

    expect(screen.queryByRole("navigation", { name: "팀 구성" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "필수 보고서" })).toBeInTheDocument();
  });
});
