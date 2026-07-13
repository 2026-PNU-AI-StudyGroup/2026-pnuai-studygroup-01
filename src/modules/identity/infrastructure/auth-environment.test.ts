import { describe, expect, it } from "vitest";

import { parseAuthEnvironment } from "./auth-environment";

const validEnvironment = {
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "01234567890123456789012345678901",
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
});
