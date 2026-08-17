import { describe, expect, it } from "vitest";

import { normalizeEmailHref } from "@/modules/email/domain/email-delivery";

describe("normalizeEmailHref", () => {
  it("서비스 내부 경로는 그대로 둔다", () => {
    expect(normalizeEmailHref("/projects/1/reports")).toBe("/projects/1/reports");
  });

  it("값이 비어 있으면 기본 경로로 떨어뜨린다", () => {
    // email_delivery.href 는 nullable 이고 발송·취소 후 본문과 함께 비워진다.
    expect(normalizeEmailHref(null)).toBe("/dashboard");
    expect(normalizeEmailHref(undefined)).toBe("/dashboard");
    expect(normalizeEmailHref("")).toBe("/dashboard");
  });

  it("외부·프로토콜 상대 주소는 기본 경로로 막는다", () => {
    expect(normalizeEmailHref("https://evil.example.com")).toBe("/dashboard");
    expect(normalizeEmailHref("//evil.example.com")).toBe("/dashboard");
  });
});
