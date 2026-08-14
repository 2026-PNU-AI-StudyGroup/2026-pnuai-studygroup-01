import { describe, expect, it } from "vitest";
import {
  generateAdvisorToken,
  hashAdvisorToken,
  isTokenUsable,
} from "@/modules/advisor/domain/advisor-access-token";

describe("advisor access token", () => {
  it("원문 토큰은 43자 이상 URL-safe 문자열이고 해시는 sha256 hex다", () => {
    const { token, tokenHash } = generateAdvisorToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(tokenHash).toBe(hashAdvisorToken(token));
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("만료·회수 토큰은 사용 불가", () => {
    const now = new Date("2026-08-14T00:00:00Z");
    const future = new Date("2026-09-01T00:00:00Z");
    const past = new Date("2026-08-01T00:00:00Z");
    expect(isTokenUsable({ expiresAt: future, revokedAt: null }, now)).toBe(true);
    expect(isTokenUsable({ expiresAt: past, revokedAt: null }, now)).toBe(false);
    expect(isTokenUsable({ expiresAt: future, revokedAt: past }, now)).toBe(false);
  });
});
