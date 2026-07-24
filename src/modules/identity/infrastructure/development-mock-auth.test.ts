import { describe, expect, it } from "vitest";

import { canUseDevelopmentMockAuth, isUserRole } from "./development-mock-auth";

describe("개발용 목 인증 정책", () => {
  it("개발 환경의 localhost 동일 출처 요청만 허용한다", () => {
    expect(canUseDevelopmentMockAuth({ nodeEnv: "development", requestUrl: "http://localhost:3000/api/development-auth/sign-in", origin: "http://localhost:3000" })).toBe(true);
    expect(canUseDevelopmentMockAuth({ nodeEnv: "production", requestUrl: "http://localhost:3000/api/development-auth/sign-in", origin: "http://localhost:3000" })).toBe(false);
    expect(canUseDevelopmentMockAuth({ nodeEnv: "development", requestUrl: "http://192.168.0.10:3000/api/development-auth/sign-in", origin: "http://192.168.0.10:3000" })).toBe(false);
    expect(canUseDevelopmentMockAuth({ nodeEnv: "development", requestUrl: "http://localhost:3000/api/development-auth/sign-in", origin: "https://attacker.example" })).toBe(false);
  });

  it("정의된 세 역할만 받는다", () => {
    expect(isUserRole("STUDENT")).toBe(true);
    expect(isUserRole("PROFESSOR")).toBe(true);
    expect(isUserRole("ADMIN")).toBe(true);
    expect(isUserRole("OWNER")).toBe(false);
  });
});
