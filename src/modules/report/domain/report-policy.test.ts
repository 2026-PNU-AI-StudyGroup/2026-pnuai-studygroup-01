import { describe, expect, it } from "vitest";

import {
  InvalidReportInputError,
  normalizeArtifact,
  normalizeDecisionComment,
  normalizeReportFeedback,
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

  it("피드백은 1~2000자여야 한다", () => {
    expect(normalizeReportFeedback("  좋은 진행입니다  ")).toBe("좋은 진행입니다");
    expect(() => normalizeReportFeedback("   ")).toThrow(InvalidReportInputError);
    expect(() => normalizeReportFeedback("a".repeat(2_001))).toThrow(InvalidReportInputError);
  });
});
