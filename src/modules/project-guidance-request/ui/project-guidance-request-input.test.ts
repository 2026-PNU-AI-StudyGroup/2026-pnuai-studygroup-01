import { describe, expect, it } from "vitest";

import {
  cancelProjectGuidanceRequestSchema,
  createProjectGuidanceRequestSchema,
  respondProjectGuidanceRequestSchema,
} from "@/modules/project-guidance-request/ui/project-guidance-request-input";

const teamId = "70000000-0000-4000-8000-000000000001";
const requestId = "71000000-0000-4000-8000-000000000001";

describe("프로젝트 지도 요청 입력", () => {
  it("회의 희망 시각을 부산 시간으로 변환하고 문자열을 정규화한다", () => {
    const parsed = createProjectGuidanceRequestSchema.parse({
      teamId,
      kind: "MEETING",
      title: "  중간 점검 회의  ",
      content: "  진행 상황과 다음 일정을 함께 논의하고 싶습니다.  ",
      referenceUrl: " https://example.com/progress ",
      preferredAt: "2026-08-15T14:30",
    });

    expect(parsed).toEqual({
      teamId,
      kind: "MEETING",
      title: "중간 점검 회의",
      content: "진행 상황과 다음 일정을 함께 논의하고 싶습니다.",
      referenceUrl: "https://example.com/progress",
      preferredAt: new Date("2026-08-15T05:30:00.000Z"),
    });
  });

  it("빈 선택 입력을 undefined로 변환한다", () => {
    const created = createProjectGuidanceRequestSchema.parse({
      teamId,
      kind: "REVIEW",
      title: "설계 검토 요청",
      content: "현재 설계안의 책임 분리를 검토해 주세요.",
      referenceUrl: "",
      preferredAt: "",
    });
    const responded = respondProjectGuidanceRequestSchema.parse({
      teamId,
      requestId,
      response: "검토 후 의견을 남겼습니다.",
      scheduledAt: "",
    });

    expect(created.referenceUrl).toBeUndefined();
    expect(created.preferredAt).toBeUndefined();
    expect(responded.scheduledAt).toBeUndefined();
  });

  it("응답 예정 시각을 부산 시간으로 변환한다", () => {
    const parsed = respondProjectGuidanceRequestSchema.parse({
      teamId,
      requestId,
      response: "금요일 연구실에서 진행하겠습니다.",
      scheduledAt: "2026-08-21T16:00",
    });

    expect(parsed.scheduledAt?.toISOString()).toBe("2026-08-21T07:00:00.000Z");
  });

  it.each([
    "2026-02-29T10:00",
    "2026-13-01T10:00",
    "2026-08-15T24:00",
    "2026-08-15",
  ])("실제로 존재하지 않거나 형식이 잘못된 날짜 %s를 거부한다", (preferredAt) => {
    expect(createProjectGuidanceRequestSchema.safeParse({
      teamId,
      kind: "MEETING",
      title: "중간 점검 회의",
      content: "진행 상황과 다음 일정을 함께 논의하고 싶습니다.",
      referenceUrl: "",
      preferredAt,
    }).success).toBe(false);
  });

  it.each([
    "not-a-url",
    "ftp://example.com/reference",
    "//example.com/reference",
  ])("HTTP(S)가 아닌 참고 URL %s를 거부한다", (referenceUrl) => {
    expect(createProjectGuidanceRequestSchema.safeParse({
      teamId,
      kind: "REVIEW",
      title: "설계 검토 요청",
      content: "현재 설계안의 책임 분리를 검토해 주세요.",
      referenceUrl,
      preferredAt: "",
    }).success).toBe(false);
  });

  it("생성·응답·취소 입력의 잘못된 UUID를 거부한다", () => {
    expect(createProjectGuidanceRequestSchema.safeParse({
      teamId: "team-1",
      kind: "REVIEW",
      title: "설계 검토 요청",
      content: "현재 설계안의 책임 분리를 검토해 주세요.",
      referenceUrl: "",
      preferredAt: "",
    }).success).toBe(false);
    expect(respondProjectGuidanceRequestSchema.safeParse({
      teamId,
      requestId: "request-1",
      response: "검토 후 의견을 남겼습니다.",
      scheduledAt: "",
    }).success).toBe(false);
    expect(cancelProjectGuidanceRequestSchema.safeParse({
      teamId: "team-1",
      requestId,
    }).success).toBe(false);
  });

  it("제목·내용·응답 길이 경계를 검증한다", () => {
    expect(createProjectGuidanceRequestSchema.safeParse({
      teamId,
      kind: "REVIEW",
      title: "제",
      content: "짧음",
      referenceUrl: "",
      preferredAt: "",
    }).success).toBe(false);
    expect(respondProjectGuidanceRequestSchema.safeParse({
      teamId,
      requestId,
      response: "짧",
      scheduledAt: "",
    }).success).toBe(false);
  });

  it("유효한 취소 식별자를 허용한다", () => {
    expect(cancelProjectGuidanceRequestSchema.parse({ teamId, requestId })).toEqual({
      teamId,
      requestId,
    });
  });
});
