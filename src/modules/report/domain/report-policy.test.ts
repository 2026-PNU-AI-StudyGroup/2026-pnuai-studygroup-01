import { describe, expect, it } from "vitest";

import {
  InvalidReportInputError,
  normalizeArtifact,
  normalizeDecisionComment,
  normalizeReportFeedback,
  normalizeReportScore,
  validateReportDueAt,
} from "@/modules/report/domain/report-policy";

describe("보고서 정책", () => {
  it("수정 요청에 의견을 요구한다", () => {
    expect(() => normalizeDecisionComment("REVISION_REQUESTED", "  ")).toThrow(
      InvalidReportInputError,
    );
  });

  it("결과물 외부 링크는 HTTPS만 허용한다", () => {
    expect(normalizeArtifact({ title: "소스", externalUrl: "https://github.com/pnu/project" }))
      .toEqual({ title: "소스", externalUrl: "https://github.com/pnu/project" });
    expect(() => normalizeArtifact({ title: "소스", externalUrl: "http://example.com" }))
      .toThrow(InvalidReportInputError);
  });

  it("보고서 기한은 설정 시점보다 이후여야 한다", () => {
    const now = new Date("2026-07-17T00:00:00Z");
    expect(validateReportDueAt(new Date("2026-07-18T00:00:00Z"), now))
      .toEqual(new Date("2026-07-18T00:00:00Z"));
    expect(() => validateReportDueAt(now, now)).toThrow(InvalidReportInputError);
  });

  it("점수는 0~100 정수만 허용하고 총평을 다듬는다", () => {
    expect(normalizeReportScore(85, "  잘함  ")).toEqual({ score: 85, comment: "잘함" });
    expect(normalizeReportScore(0, "")).toEqual({ score: 0, comment: "" });
    expect(() => normalizeReportScore(101, "")).toThrow(InvalidReportInputError);
    expect(() => normalizeReportScore(-1, "")).toThrow(InvalidReportInputError);
    expect(() => normalizeReportScore(80.5, "")).toThrow(InvalidReportInputError);
  });

  it("피드백은 1~2000자여야 한다", () => {
    expect(normalizeReportFeedback("  좋은 진행입니다  ")).toBe("좋은 진행입니다");
    expect(() => normalizeReportFeedback("   ")).toThrow(InvalidReportInputError);
    expect(() => normalizeReportFeedback("a".repeat(2_001))).toThrow(InvalidReportInputError);
  });
});
