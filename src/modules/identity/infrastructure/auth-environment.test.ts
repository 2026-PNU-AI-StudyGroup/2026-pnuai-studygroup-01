import { describe, expect, it } from "vitest";

import { parseAuthEnvironment } from "./auth-environment";

const validEnvironment = {
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "G7r!k2Pq9#vL4mX8sN6cB1zD5wF0hJ3u",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
};

describe("auth environment", () => {
  it("짧은 인증 비밀키를 거부한다", () => {
    expect(() =>
      parseAuthEnvironment({
        ...validEnvironment,
        BETTER_AUTH_SECRET: "too-short",
      }),
    ).toThrow();
  });

  it("공개된 예시 인증 비밀키를 거부한다", () => {
    expect(() => parseAuthEnvironment({
      ...validEnvironment,
      BETTER_AUTH_SECRET: "replace_with_at_least_32_random_characters",
    })).toThrow();
  });

  it("운영 환경의 HTTP 인증 URL을 거부한다", () => {
    expect(() => parseAuthEnvironment({
      ...validEnvironment,
      NODE_ENV: "production",
      BETTER_AUTH_URL: "http://pms.example.edu",
    })).toThrow();
  });

  it("개발용 목 인증 활성화 시 허용 호스트를 요구한다", () => {
    expect(() => parseAuthEnvironment({
      ...validEnvironment,
      ENABLE_DEVELOPMENT_MOCK_AUTH: "true",
    })).toThrow();

    expect(parseAuthEnvironment({
      ...validEnvironment,
      ENABLE_DEVELOPMENT_MOCK_AUTH: "true",
      DEVELOPMENT_MOCK_AUTH_HOSTS: "pnu-pms.jun0.dev",
    }).DEVELOPMENT_MOCK_AUTH_HOSTS).toBe("pnu-pms.jun0.dev");
  });
});
