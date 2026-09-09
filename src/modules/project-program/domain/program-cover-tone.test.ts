import { describe, expect, it } from "vitest";

import { PROGRAM_COVER_TONE_COUNT, programCoverTone } from "@/modules/project-program/domain/program-cover-tone";

describe("표지 색 고르기", () => {
  it("같은 프로젝트는 언제나 같은 색이다", () => {
    // 새로고침할 때마다 색이 바뀌면 목록이 요동친다.
    const id = "40000000-0000-4000-8000-000000000001";

    expect(programCoverTone(id)).toBe(programCoverTone(id));
  });

  it("정해 둔 여덟 가지 안에서만 고른다", () => {
    const tones = Array.from({ length: 200 }, (_, index) => programCoverTone(`topic-${index}`));

    for (const tone of tones) {
      expect(tone).toBeGreaterThanOrEqual(1);
      expect(tone).toBeLessThanOrEqual(PROGRAM_COVER_TONE_COUNT);
    }
  });

  it("여덟 가지를 고루 쓴다", () => {
    // 한두 가지에 쏠리면 색을 나눈 뜻이 없다.
    const used = new Set(Array.from({ length: 200 }, (_, index) => programCoverTone(`topic-${index}`)));

    expect(used.size).toBe(PROGRAM_COVER_TONE_COUNT);
  });

  it("빈 문자열도 색을 낸다", () => {
    expect(programCoverTone("")).toBeGreaterThanOrEqual(1);
  });
});
