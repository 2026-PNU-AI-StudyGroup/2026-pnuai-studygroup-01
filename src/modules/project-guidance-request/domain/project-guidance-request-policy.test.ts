import { describe, expect, it } from "vitest";

import {
  normalizeProjectGuidanceRequest,
  normalizeProjectGuidanceResponse,
} from "@/modules/project-guidance-request/domain/project-guidance-request-policy";

const now = new Date("2026-08-03T00:00:00Z");

describe("프로젝트 지도 요청 정책", () => {
  it("회의 요청의 문자열과 링크를 정규화한다", () => {
    expect(normalizeProjectGuidanceRequest({
      kind: "MEETING",
      title: "  중간 점검  ",
      content: "  진행 상황을 함께 확인하고 싶습니다.  ",
      referenceUrl: " https://example.com/progress ",
    })).toEqual({
      title: "중간 점검",
      content: "진행 상황을 함께 확인하고 싶습니다.",
      referenceUrl: "https://example.com/progress",
      preferredAt: null,
    });
  });

  it("회의 요청은 학생 희망 일시 없이 작성한다", () => {
    expect(normalizeProjectGuidanceRequest({
      kind: "MEETING",
      title: "중간 점검",
      content: "진행 상황을 확인해 주세요.",
    })).toEqual(expect.objectContaining({ preferredAt: null }));
  });

  it("HTTP(S)가 아닌 참고 링크를 거부한다", () => {
    expect(() => normalizeProjectGuidanceRequest({
      kind: "REVIEW",
      title: "설계 검토",
      content: "도메인 경계를 검토해 주세요.",
      referenceUrl: "javascript:alert(1)",
    })).toThrow("HTTP 또는 HTTPS");
  });

  it("답변과 선택적 미래 확정 일시를 정규화한다", () => {
    expect(normalizeProjectGuidanceResponse({
      response: "  금요일에 확인하겠습니다.  ",
      scheduledAt: new Date("2026-08-04T00:00:00Z"),
    }, now)).toEqual({
      response: "금요일에 확인하겠습니다.",
      scheduledAt: new Date("2026-08-04T00:00:00Z"),
    });
  });

  it("과거 확정 일시와 범위를 벗어난 텍스트를 거부한다", () => {
    expect(() => normalizeProjectGuidanceResponse({ response: "답변", scheduledAt: now }, now)).toThrow("현재 이후");
    expect(() => normalizeProjectGuidanceResponse({ response: "가" }, now)).toThrow("2자 이상");
    expect(() => normalizeProjectGuidanceRequest({ kind: "REVIEW", title: "제", content: "충분한 내용" })).toThrow("2자 이상");
  });
});
