import { describe, expect, it } from "vitest";

import {
  EMAIL_DELIVERY_KINDS,
  EMAIL_PREFERENCE_SELECT,
  emailPreferenceAllows,
  emailPreferenceFlag,
  normalizeEmailHref,
} from "@/modules/email/domain/email-delivery";

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
    expect(emailPreferenceAllows("ACCOUNT_STATUS", { discussionEnabled: false })).toBe(true);
  });

  it("보고서·토론 알림은 설정을 켜야 보낸다", () => {
    expect(emailPreferenceAllows("REPORT_ACTIVITY", null)).toBe(false);
    expect(emailPreferenceAllows("DISCUSSION", null)).toBe(false);
    expect(emailPreferenceAllows("REPORT_ACTIVITY", { reportActivityEnabled: true })).toBe(true);
  });

  it("고를 수 있는 메일은 전부 기본이 꺼짐이다", () => {
    // 교수님들이 관리자로도 들어와 계셔서 운영 메일이 한 사람에게 몰렸다. 받고 싶은
    // 사람이 마이페이지에서 켜는 방식으로 통일했다. 앱 안 알림은 이 설정과 무관하다.
    expect(emailPreferenceAllows("TOPIC_APPROVAL", null)).toBe(false);
    expect(emailPreferenceAllows("DEADLINE", null)).toBe(false);
    expect(emailPreferenceAllows("TOPIC_APPROVAL", { programActivityEnabled: true })).toBe(true);
    expect(emailPreferenceAllows("DEADLINE", { deadlineEnabled: true })).toBe(true);
  });
});

describe("EMAIL_PREFERENCE_SELECT", () => {
  // 이 검사가 없어서 마감 메일이 통째로 죽어 있었다. emailPreferenceAllows 는 맞게
  // 동작했지만 두 저장소의 select 가 deadlineEnabled 를 안 읽어 항상 undefined 였고,
  // undefined 는 기본값(꺼짐)으로 떨어졌다. 순수 함수만 검증하면 이 배선이 안 잡힌다.
  it("수신 설정을 보는 모든 메일 종류의 필드를 읽는다", () => {
    const readable = Object.keys(EMAIL_PREFERENCE_SELECT);
    for (const kind of EMAIL_DELIVERY_KINDS) {
      const flag = emailPreferenceFlag(kind);
      if (flag) expect(readable, `${kind} 가 보는 ${flag}`).toContain(flag);
    }
  });
});
