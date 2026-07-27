import { describe, expect, it } from "vitest";

import {
  buildProjectDashboardCounts,
  parseProjectDashboardView,
} from "@/app/dashboard/_lib/project-dashboard-view";

describe("내 프로젝트 상태 보기", () => {
  it("지원과 실제 프로젝트를 중복 없이 상태별로 집계한다", () => {
    expect(buildProjectDashboardCounts({
      pending: 2,
      rejected: 1,
      active: 3,
      completed: 4,
    })).toEqual({
      all: 10,
      pending: 2,
      rejected: 1,
      active: 3,
      completed: 4,
    });
  });

  it("지원하지 않는 보기 값은 전체로 정규화한다", () => {
    expect(parseProjectDashboardView("pending")).toBe("pending");
    expect(parseProjectDashboardView("unknown")).toBe("all");
    expect(parseProjectDashboardView(["active", "rejected"])).toBe("all");
  });
});
