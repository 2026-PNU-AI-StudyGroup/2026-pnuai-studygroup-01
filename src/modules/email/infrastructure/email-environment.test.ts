import { describe, expect, it } from "vitest";

import { parseEmailEnvironment } from "@/modules/email/infrastructure/email-environment";

describe("parseEmailEnvironment", () => {
  it("기본값은 비활성화이며 활성화할 때 Gmail OAuth2 환경을 검증한다", () => {
    expect(parseEmailEnvironment({})).toEqual({ enabled: false });
    expect(() => parseEmailEnvironment({ EMAIL_DELIVERY_ENABLED: "true" })).toThrow();
  });

  it("발송 계정·회신 주소를 정규화하고 APP_URL origin만 유지한다", () => {
    expect(parseEmailEnvironment({
      EMAIL_DELIVERY_ENABLED: "true",
      APP_URL: "https://pms.example.pusan.ac.kr/path",
      GMAIL_SMTP_USER: " PMS-MAIL@pusan.ac.kr ",
      GMAIL_OAUTH_CLIENT_ID: "client",
      GMAIL_OAUTH_CLIENT_SECRET: "secret",
      GMAIL_OAUTH_REFRESH_TOKEN: "refresh",
      EMAIL_REPLY_TO: " Help@pusan.ac.kr ",
    })).toEqual(expect.objectContaining({
      enabled: true,
      APP_URL: "https://pms.example.pusan.ac.kr",
      GMAIL_SMTP_USER: "pms-mail@pusan.ac.kr",
      EMAIL_REPLY_TO: "help@pusan.ac.kr",
    }));
  });
});
