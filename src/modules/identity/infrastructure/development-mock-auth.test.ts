import { describe, expect, it } from "vitest";

import { canUseDevelopmentMockAuth, isUserRole } from "./development-mock-auth";

describe("개발용 목 인증 정책", () => {
  it("개발 환경의 localhost 동일 출처 요청만 허용한다", () => {
    const defaults = { explicitlyEnabled: undefined, allowedHostnames: undefined };
    expect(canUseDevelopmentMockAuth({ ...defaults, nodeEnv: "development", requestUrl: "http://localhost:3000/api/development-auth/sign-in", origin: "http://localhost:3000" })).toBe(true);
    expect(canUseDevelopmentMockAuth({ ...defaults, nodeEnv: "production", requestUrl: "http://localhost:3000/api/development-auth/sign-in", origin: "http://localhost:3000" })).toBe(false);
    expect(canUseDevelopmentMockAuth({ ...defaults, nodeEnv: "development", requestUrl: "http://192.168.0.10:3000/api/development-auth/sign-in", origin: "http://192.168.0.10:3000" })).toBe(false);
    expect(canUseDevelopmentMockAuth({ ...defaults, nodeEnv: "development", requestUrl: "http://localhost:3000/api/development-auth/sign-in", origin: "https://attacker.example" })).toBe(false);
  });

  it("명시적으로 활성화한 배포에서는 허용 호스트의 동일 출처 요청만 허용한다", () => {
    const deployment = {
      nodeEnv: "production",
      explicitlyEnabled: "true",
      allowedHostnames: "pnu-pms.jun0.dev, 192.168.32.32",
    };
    expect(canUseDevelopmentMockAuth({
      ...deployment,
      requestUrl: "https://pnu-pms.jun0.dev/api/development-auth/sign-in",
      origin: "https://pnu-pms.jun0.dev",
    })).toBe(true);
    expect(canUseDevelopmentMockAuth({
      ...deployment,
      requestUrl: "http://192.168.32.32:3100/api/development-auth/sign-in",
      origin: "http://192.168.32.32:3100",
    })).toBe(true);
    expect(canUseDevelopmentMockAuth({
      ...deployment,
      requestUrl: "https://attacker.example/api/development-auth/sign-in",
      origin: "https://attacker.example",
    })).toBe(false);
    expect(canUseDevelopmentMockAuth({
      ...deployment,
      requestUrl: "https://pnu-pms.jun0.dev/api/development-auth/sign-in",
      origin: "https://attacker.example",
    })).toBe(false);
  });

  it("standalone 서버 내부 URL 대신 검증된 외부 Host와 전달 헤더를 사용한다", () => {
    const deployment = {
      nodeEnv: "production",
      explicitlyEnabled: "true",
      allowedHostnames: "pnu-pms.jun0.dev,192.168.32.32",
      requestUrl: "http://localhost:3000/api/development-auth/sign-in",
    };
    expect(canUseDevelopmentMockAuth({
      ...deployment,
      origin: "http://192.168.32.32:3100",
      host: "192.168.32.32:3100",
    })).toBe(true);
    expect(canUseDevelopmentMockAuth({
      ...deployment,
      origin: "https://pnu-pms.jun0.dev",
      host: "localhost:3000",
      forwardedHost: "pnu-pms.jun0.dev",
      forwardedProto: "https",
    })).toBe(true);
    expect(canUseDevelopmentMockAuth({
      ...deployment,
      origin: "https://attacker.example",
      host: "localhost:3000",
      forwardedHost: "pnu-pms.jun0.dev",
      forwardedProto: "https",
    })).toBe(false);
  });

  it("정의된 세 역할만 받는다", () => {
    expect(isUserRole("STUDENT")).toBe(true);
    expect(isUserRole("PROFESSOR")).toBe(true);
    expect(isUserRole("ADMIN")).toBe(true);
    expect(isUserRole("OWNER")).toBe(false);
  });
});
