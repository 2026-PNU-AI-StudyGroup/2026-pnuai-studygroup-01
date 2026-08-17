import { z } from "zod";

const disabledSchema = z.object({
  EMAIL_DELIVERY_ENABLED: z.enum(["true", "false"]).optional().default("false"),
});

// .env 에서 값을 비워 둔 항목은 undefined 가 아니라 빈 문자열로 들어온다.
// 선택 항목이 빈 문자열이면 미설정으로 본다.
const blankAsUndefined = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email().optional(),
);

const enabledSchema = z.object({
  EMAIL_DELIVERY_ENABLED: z.literal("true"),
  APP_URL: z.string().url(),
  GMAIL_SMTP_USER: z.string().trim().email(),
  GMAIL_OAUTH_CLIENT_ID: z.string().trim().min(1),
  GMAIL_OAUTH_CLIENT_SECRET: z.string().trim().min(1),
  GMAIL_OAUTH_REFRESH_TOKEN: z.string().trim().min(1),
  EMAIL_FROM_NAME: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().min(1).max(100).default("PNU 프로젝트 관리 시스템"),
  ),
  EMAIL_REPLY_TO: blankAsUndefined,
});

export type EmailEnvironment =
  | { enabled: false }
  | ({ enabled: true } & Omit<z.infer<typeof enabledSchema>, "EMAIL_DELIVERY_ENABLED">);

export function parseEmailEnvironment(
  environment: Record<string, string | undefined>,
): EmailEnvironment {
  const enabled = disabledSchema.parse(environment).EMAIL_DELIVERY_ENABLED === "true";
  if (!enabled) return { enabled: false };
  const parsed = enabledSchema.parse(environment);
  return {
    enabled: true,
    APP_URL: new URL(parsed.APP_URL).origin,
    GMAIL_SMTP_USER: parsed.GMAIL_SMTP_USER.toLowerCase(),
    GMAIL_OAUTH_CLIENT_ID: parsed.GMAIL_OAUTH_CLIENT_ID,
    GMAIL_OAUTH_CLIENT_SECRET: parsed.GMAIL_OAUTH_CLIENT_SECRET,
    GMAIL_OAUTH_REFRESH_TOKEN: parsed.GMAIL_OAUTH_REFRESH_TOKEN,
    EMAIL_FROM_NAME: parsed.EMAIL_FROM_NAME,
    EMAIL_REPLY_TO: parsed.EMAIL_REPLY_TO?.toLowerCase(),
  };
}
