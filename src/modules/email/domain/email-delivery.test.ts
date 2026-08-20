import { describe, expect, it } from "vitest";

import { emailPreferenceAllows, normalizeEmailHref } from "@/modules/email/domain/email-delivery";

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

describe("emailPreferenceAllows", () => {
  it("수신 설정이 없는 종류는 항상 보낸다", () => {
    expect(emailPreferenceAllows("TEAM_INVITATION", null)).toBe(true);
    expect(emailPreferenceAllows("DEADLINE", { discussionEnabled: false })).toBe(true);
  });

  it("보고서·토론 알림은 설정을 켜야 보낸다", () => {
    expect(emailPreferenceAllows("REPORT_ACTIVITY", null)).toBe(false);
    expect(emailPreferenceAllows("DISCUSSION", null)).toBe(false);
    expect(emailPreferenceAllows("REPORT_ACTIVITY", { reportActivityEnabled: true })).toBe(true);
  });

  it("프로그램 운영 알림은 담당자 업무 메일이라 기본이 켜짐이다", () => {
    // 설정 행이 없는 관리자에게도 검토 요청이 가야 한다. 끈 사람만 빠진다.
    expect(emailPreferenceAllows("TOPIC_APPROVAL", null)).toBe(true);
    expect(emailPreferenceAllows("TOPIC_APPROVAL", { programActivityEnabled: false })).toBe(false);
  });
});
