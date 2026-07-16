import { afterEach, describe, expect, it } from "vitest";

import { getDeadlineCronSecret, isAuthorizedCronRequest } from "@/modules/notification/infrastructure/deadline-environment";

const previous = process.env.CRON_SECRET;

afterEach(() => {
  process.env.CRON_SECRET = previous;
});

describe("마감 알림 작업 인증", () => {
  it("충분히 긴 무작위 비밀값만 허용한다", () => {
    process.env.CRON_SECRET = "a-secure-random-cron-secret-with-48-characters-1234";
    expect(getDeadlineCronSecret()).toBe(process.env.CRON_SECRET);
    process.env.CRON_SECRET = "placeholder";
    expect(() => getDeadlineCronSecret()).toThrow();
  });

  it("Bearer 토큰을 상수 시간 비교한다", () => {
    const secret = "a-secure-random-cron-secret-with-48-characters-1234";
    expect(isAuthorizedCronRequest(`Bearer ${secret}`, secret)).toBe(true);
    expect(isAuthorizedCronRequest("Bearer wrong", secret)).toBe(false);
    expect(isAuthorizedCronRequest(null, secret)).toBe(false);
  });
});
