import { describe, expect, it } from "vitest";

import { parseProgramManagementTab, programManagementHref } from "@/modules/project-program/ui/program-management-query";

describe("program management query", () => {
  it("관리 탭과 현황 필터를 통합 topics 주소로 만든다", () => {
    expect(programManagementHref("program-1", "overview", { progress: "overdue", page: 2 }))
      .toBe("/topics?programId=program-1&mode=manage&tab=overview&progress=overdue&page=2");
  });

  it("알 수 없는 탭은 현황으로 정규화한다", () => {
    expect(parseProgramManagementTab("unknown")).toBe("overview");
  });
});
