import { describe, expect, it } from "vitest";

import { hasTopicsFilters, topicsHref } from "@/app/topics/_lib/topics-query";

describe("topicsHref", () => {
  it("진행 중 화면의 문맥과 필터를 안정된 순서로 직렬화한다", () => {
    expect(topicsHref({
      view: "active",
      programId: "program-1",
      q: "길 찾기",
      divisionId: "division-1",
      operation: "overdue",
      page: 2,
    })).toBe("/topics?programId=program-1&divisionId=division-1&q=%EA%B8%B8+%EC%B0%BE%EA%B8%B0&operation=overdue&page=2");
  });

  it("지난 화면 문맥은 유지하고 기본값은 URL에서 생략한다", () => {
    expect(topicsHref({ view: "past", programId: "program-1", operation: "all", page: 1 }))
      .toBe("/topics?view=past&programId=program-1");
    expect(topicsHref({ view: "active" })).toBe("/topics");
  });
});

describe("hasTopicsFilters", () => {
  it("검색·분과·운영 상태만 실제 필터로 취급한다", () => {
    expect(hasTopicsFilters({})).toBe(false);
    expect(hasTopicsFilters({ operation: "all" })).toBe(false);
    expect(hasTopicsFilters({ q: "길찾기" })).toBe(true);
    expect(hasTopicsFilters({ divisionId: "UNASSIGNED" })).toBe(true);
    expect(hasTopicsFilters({ operation: "submitted" })).toBe(true);
  });
});
