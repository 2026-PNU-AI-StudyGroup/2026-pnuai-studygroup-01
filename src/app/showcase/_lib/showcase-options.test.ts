import { describe, expect, it } from "vitest";

import { normalizeShowcaseUrl, toYoutubeEmbedUrl } from "@/app/showcase/_lib/showcase-options";

describe("normalizeShowcaseUrl", () => {
  it("빈 값·null은 null", () => {
    expect(normalizeShowcaseUrl(null)).toBeNull();
    expect(normalizeShowcaseUrl("")).toBeNull();
    expect(normalizeShowcaseUrl("   ")).toBeNull();
  });
  it("http/https는 통과", () => {
    expect(normalizeShowcaseUrl("https://a.com/x")).toBe("https://a.com/x");
    expect(normalizeShowcaseUrl(" http://a.com ")).toBe("http://a.com");
  });
  it("비-http 스킴·형식 오류는 undefined", () => {
    expect(normalizeShowcaseUrl("ftp://a.com")).toBeUndefined();
    expect(normalizeShowcaseUrl("javascript:alert(1)")).toBeUndefined();
    expect(normalizeShowcaseUrl("notaurl")).toBeUndefined();
    expect(normalizeShowcaseUrl(`https://a.com/${"x".repeat(600)}`)).toBeUndefined();
  });
});

describe("toYoutubeEmbedUrl", () => {
  it("watch/short/embed/youtu.be를 embed로 변환", () => {
    const id = "dQw4w9WgXcQ";
    for (const url of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
    ]) {
      expect(toYoutubeEmbedUrl(url)).toBe(`https://www.youtube.com/embed/${id}`);
    }
  });
  it("유튜브 아님·null은 null", () => {
    expect(toYoutubeEmbedUrl("https://vimeo.com/123")).toBeNull();
    expect(toYoutubeEmbedUrl(null)).toBeNull();
  });
});
