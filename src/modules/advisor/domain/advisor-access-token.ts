import { createHash, randomBytes } from "node:crypto";

export const ADVISOR_TOKEN_TTL_DAYS = 90;

export function generateAdvisorToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashAdvisorToken(token) };
}

export function hashAdvisorToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function advisorTokenExpiry(from = new Date()): Date {
  return new Date(from.getTime() + ADVISOR_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isTokenUsable(
  token: { expiresAt: Date; revokedAt: Date | null },
  now = new Date(),
): boolean {
  return token.revokedAt === null && token.expiresAt > now;
}
