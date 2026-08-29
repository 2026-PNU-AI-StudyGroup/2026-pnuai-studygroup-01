import { beforeEach, describe, expect, it } from "vitest";

import {
  checkFeedbackRateLimit,
  feedbackClientKey,
  resetFeedbackRateLimit,
} from "@/app/feedback/_lib/feedback-rate-limit";

const headersOf = (values: Record<string, string>) => ({
  get: (name: string) => values[name] ?? null,
});

beforeEach(() => {
  resetFeedbackRateLimit();
});

describe("feedbackClientKey", () => {
  it("프록시가 붙인 첫 주소를 쓴다", () => {
    expect(feedbackClientKey(headersOf({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("헤더가 없으면 하나로 묶는다", () => {
    // 전체 제한만 걸리게 된다. 개별 제한이 통째로 풀리지 않는 것이 중요하다.
    expect(feedbackClientKey(headersOf({}))).toBe("unknown");
  });
});

describe("checkFeedbackRateLimit", () => {
  const now = 1_000_000;

  it("같은 요청자는 1분에 세 번까지 받는다", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(checkFeedbackRateLimit("client-a", now).allowed).toBe(true);
    }
    const blocked = checkFeedbackRateLimit("client-a", now);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("창이 지나면 다시 받는다", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) checkFeedbackRateLimit("client-a", now);
    expect(checkFeedbackRateLimit("client-a", now + 60_001).allowed).toBe(true);
  });

  it("다른 요청자는 서로 영향을 주지 않는다", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) checkFeedbackRateLimit("client-a", now);
    expect(checkFeedbackRateLimit("client-b", now).allowed).toBe(true);
  });

  it("주소를 바꿔 가며 들어와도 전체 제한에 걸린다", () => {
    // 개별 제한만 있으면 IP 를 돌려 가며 무제한으로 넣을 수 있다.
    let allowed = 0;
    for (let index = 0; index < 40; index += 1) {
      if (checkFeedbackRateLimit(`client-${index}`, now).allowed) allowed += 1;
    }
    expect(allowed).toBe(20);
  });

  it("막을 때 다시 시도할 시각을 알려 준다", () => {
    for (let attempt = 0; attempt < 3; attempt += 1) checkFeedbackRateLimit("client-a", now);
    const blocked = checkFeedbackRateLimit("client-a", now + 30_000);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfterSeconds).toBe(30);
  });
});
