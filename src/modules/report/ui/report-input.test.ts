import { describe, expect, it } from "vitest";

import { reportRequirementSchema } from "@/modules/report/ui/report-input";

describe("보고서 요구사항 입력", () => {
  it("부산 시간의 제출 기한을 명시적인 시각으로 변환한다", () => {
    const parsed = reportRequirementSchema.parse({
      teamId: "70000000-0000-4000-8000-000000000001",
      type: "FINAL",
      dueAt: "2026-12-15T23:59",
    });
    expect(parsed.dueAt.toISOString()).toBe("2026-12-15T14:59:00.000Z");
  });

  it("분 단위 형식이 아닌 기한을 거부한다", () => {
    expect(reportRequirementSchema.safeParse({
      teamId: "70000000-0000-4000-8000-000000000001",
      type: "FINAL",
      dueAt: "2026-12-15",
    }).success).toBe(false);
  });
});
