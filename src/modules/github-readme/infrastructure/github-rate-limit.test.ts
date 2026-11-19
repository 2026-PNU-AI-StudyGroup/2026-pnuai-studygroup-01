import { describe, expect, it } from "vitest";

import { takeGithubQuota } from "@/modules/github-readme/infrastructure/github-rate-limit";

describe("takeGithubQuota", () => {
  it("10분에 10번까지 허용하고 11번째는 막는다", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i += 1) expect(takeGithubQuota("user-a", now + i)).toBe(true);
    expect(takeGithubQuota("user-a", now + 10)).toBe(false);
  });

  it("창이 지나면 다시 허용한다", () => {
    const now = 2_000_000;
    for (let i = 0; i < 10; i += 1) takeGithubQuota("user-b", now);
    expect(takeGithubQuota("user-b", now + 1)).toBe(false);
    expect(takeGithubQuota("user-b", now + 10 * 60_000)).toBe(true);
  });

  it("사용자끼리 섞이지 않는다", () => {
    const now = 3_000_000;
    for (let i = 0; i < 10; i += 1) takeGithubQuota("user-c", now);
    expect(takeGithubQuota("user-c", now)).toBe(false);
    expect(takeGithubQuota("user-d", now)).toBe(true);
  });
});
