import { describe, expect, it } from "vitest";

import {
  parseAdminProjectPage,
  parseAdminProjectProgressFilter,
} from "@/modules/team/ui/admin-project-overview-query";

describe("관리자 프로젝트 현황 URL", () => {
  it("지원하는 진행 구간만 허용하고 나머지는 전체로 정규화한다", () => {
    expect(parseAdminProjectProgressFilter("overdue")).toBe("overdue");
    expect(parseAdminProjectProgressFilter("completed")).toBe("completed");
    expect(parseAdminProjectProgressFilter("unknown")).toBe("all");
    expect(parseAdminProjectProgressFilter(undefined)).toBe("all");
  });

  it("양의 정수 페이지만 허용한다", () => {
    expect(parseAdminProjectPage("3")).toBe(3);
    expect(parseAdminProjectPage("0")).toBe(1);
    expect(parseAdminProjectPage("1.5")).toBe(1);
    expect(parseAdminProjectPage("invalid")).toBe(1);
  });
});
