import { z } from "zod";

const authEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32).refine(
    (value) => !/replace|change.?me|example|0123456789/i.test(value),
    "공개된 예시 값이 아닌 무작위 인증 비밀키가 필요합니다.",
  ),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  ENABLE_DEVELOPMENT_MOCK_AUTH: z.enum(["true", "false"]).optional(),
  DEVELOPMENT_MOCK_AUTH_HOSTS: z.string().optional(),
}).superRefine((value, context) => {
  const mockAuthEnabled = value.NODE_ENV === "development"
    || value.ENABLE_DEVELOPMENT_MOCK_AUTH === "true";
  if (!mockAuthEnabled) {
    if (!value.GOOGLE_CLIENT_ID) {
      context.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_ID"], message: "Google OAuth 클라이언트 ID가 필요합니다." });
    }
    if (!value.GOOGLE_CLIENT_SECRET) {
      context.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_SECRET"], message: "Google OAuth 클라이언트 비밀키가 필요합니다." });
    }
  }
  if (value.NODE_ENV === "production" && !value.BETTER_AUTH_URL.startsWith("https://")) {
    context.addIssue({ code: "custom", path: ["BETTER_AUTH_URL"], message: "운영 환경 인증 URL은 HTTPS여야 합니다." });
  }
  if (value.ENABLE_DEVELOPMENT_MOCK_AUTH === "true" && !value.DEVELOPMENT_MOCK_AUTH_HOSTS?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["DEVELOPMENT_MOCK_AUTH_HOSTS"],
      message: "개발용 목 인증을 활성화할 때는 허용 호스트를 지정해야 합니다.",
    });
  }
});

export function parseAuthEnvironment(
  environment: Record<string, string | undefined>,
) {
  return authEnvironmentSchema.parse(environment);
}
