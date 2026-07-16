import { z } from "zod";

const authEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32).refine(
    (value) => !/replace|change.?me|example|0123456789/i.test(value),
    "공개된 예시 값이 아닌 무작위 인증 비밀키가 필요합니다.",
  ),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && !value.BETTER_AUTH_URL.startsWith("https://")) {
    context.addIssue({ code: "custom", path: ["BETTER_AUTH_URL"], message: "운영 환경 인증 URL은 HTTPS여야 합니다." });
  }
});

export function parseAuthEnvironment(
  environment: Record<string, string | undefined>,
) {
  return authEnvironmentSchema.parse(environment);
}
