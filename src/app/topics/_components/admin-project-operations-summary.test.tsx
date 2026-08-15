import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminProjectOperationsSummary } from "@/app/topics/_components/admin-project-operations-summary";

describe("AdminProjectOperationsSummary", () => {
  it("프로그램 전체 집계를 보여주고 선택한 상태로 같은 목록을 필터링한다", () => {
    render(
      <AdminProjectOperationsSummary
        programId="program-1"
        operations={{
          summary: { total: 4, operating: 3, unassigned: 1, overdue: 1, submitted: 1 },
          matchingTopicIds: ["topic-2", "topic-3"],
        }}
        selectedFilter="overdue"
        divisionId="division-1"
        query="길찾기"
      />,
    );

    expect(screen.getByRole("heading", { name: "운영 상태" })).toHaveClass("sr-only");
    expect(screen.getByRole("link", { name: "기한 초과 1개" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "기한 초과 1개" })).toHaveAttribute(
      "href",
      "/topics?programId=program-1&divisionId=division-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0&operation=overdue",
    );
    expect(screen.getByRole("link", { name: "전체 4개" })).toHaveAttribute(
      "href",
      "/topics?programId=program-1&divisionId=division-1&q=%EA%B8%B8%EC%B0%BE%EA%B8%B0",
    );
  });
});
