import { timingSafeEqual } from "node:crypto";

export function getDeadlineCronSecret() {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 32 || /^(replace|change|example|placeholder)/i.test(secret)) {
    throw new Error("CRON_SECRET은 32자 이상의 무작위 값이어야 합니다.");
  }
  return secret;
}

export function isAuthorizedCronRequest(authorization: string | null, secret: string) {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(secret);
  return tokenBuffer.length === secretBuffer.length && timingSafeEqual(tokenBuffer, secretBuffer);
}
