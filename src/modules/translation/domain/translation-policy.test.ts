import { describe, expect, it } from "vitest";

import {
  InvalidTranslationInputError,
  normalizeTranslationText,
} from "@/modules/translation/domain/translation-policy";

describe("번역 입력 정책", () => {
  it("앞뒤 공백을 제거한다", () => {
    expect(normalizeTranslationText("  졸업과제 주제  ")).toBe("졸업과제 주제");
  });

  it("빈 문자열과 8,000자 초과 문자열을 거부한다", () => {
    expect(() => normalizeTranslationText("   ")).toThrow(InvalidTranslationInputError);
    expect(() => normalizeTranslationText("가".repeat(8_001))).toThrow(InvalidTranslationInputError);
  });
});
