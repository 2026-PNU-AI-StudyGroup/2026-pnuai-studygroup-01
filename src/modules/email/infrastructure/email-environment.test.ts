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

  it("비워 둔 선택 항목은 미설정으로 본다", () => {
    // .env 에 `EMAIL_REPLY_TO=` 처럼 값 없이 남겨두면 빈 문자열로 들어온다.
    const parsed = parseEmailEnvironment({
      EMAIL_DELIVERY_ENABLED: "true",
      APP_URL: "https://pms.example.pusan.ac.kr",
      GMAIL_SMTP_USER: "pms-mail@pusan.ac.kr",
      GMAIL_OAUTH_CLIENT_ID: "client",
      GMAIL_OAUTH_CLIENT_SECRET: "secret",
      GMAIL_OAUTH_REFRESH_TOKEN: "refresh",
      EMAIL_FROM_NAME: "",
      EMAIL_REPLY_TO: "",
    });
    expect(parsed).toEqual(expect.objectContaining({
      enabled: true,
      EMAIL_FROM_NAME: "PNU AIPMS",
    }));
    expect(parsed.enabled && parsed.EMAIL_REPLY_TO).toBeUndefined();
  });

  it("회신 주소 형식이 틀리면 여전히 거부한다", () => {
    expect(() => parseEmailEnvironment({
      EMAIL_DELIVERY_ENABLED: "true",
      APP_URL: "https://pms.example.pusan.ac.kr",
      GMAIL_SMTP_USER: "pms-mail@pusan.ac.kr",
      GMAIL_OAUTH_CLIENT_ID: "client",
      GMAIL_OAUTH_CLIENT_SECRET: "secret",
      GMAIL_OAUTH_REFRESH_TOKEN: "refresh",
      EMAIL_REPLY_TO: "not-an-email",
    })).toThrow();
  });
});
