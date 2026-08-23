import { describe, expect, it } from "vitest";

import {
  InvalidReportInputError,
  normalizeArtifact,
  normalizeDecisionComment,
  normalizeReportFeedback,
  normalizeYoutubeUrl,
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

  it("쇼케이스 영상은 HTTPS YouTube 링크만 정규화한다", () => {
    expect(normalizeYoutubeUrl("https://youtu.be/Uou5iwWqTDA"))
      .toBe("https://www.youtube.com/watch?v=Uou5iwWqTDA");
    expect(() => normalizeYoutubeUrl("https://example.com/video")).toThrow(InvalidReportInputError);
    expect(() => normalizeYoutubeUrl("https://notyoutube.com/watch?v=Uou5iwWqTDA")).toThrow(InvalidReportInputError);

    // 모바일 브라우저 주소창에서 복사하면 m.youtube.com 이 온다. 학생이 실제로 붙여 넣는 형태다.
    expect(normalizeYoutubeUrl("https://m.youtube.com/watch?v=Uou5iwWqTDA"))
      .toBe("https://www.youtube.com/watch?v=Uou5iwWqTDA");
    expect(normalizeYoutubeUrl("https://music.youtube.com/watch?v=Uou5iwWqTDA"))
      .toBe("https://www.youtube.com/watch?v=Uou5iwWqTDA");
    expect(normalizeYoutubeUrl("https://www.youtube-nocookie.com/embed/Uou5iwWqTDA"))
      .toBe("https://www.youtube.com/watch?v=Uou5iwWqTDA");
  });
});
