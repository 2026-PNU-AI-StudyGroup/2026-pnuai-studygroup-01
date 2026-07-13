import { z } from "zod";

const authEnvironmentSchema = z.object({
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

export function parseAuthEnvironment(
  environment: Record<string, string | undefined>,
) {
  return authEnvironmentSchema.parse(environment);
}
