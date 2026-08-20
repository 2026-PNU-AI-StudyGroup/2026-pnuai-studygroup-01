import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ClaimedEmailDelivery, EmailTransport } from "@/modules/email/application/email-delivery-ports";
import { emailPreferenceAllows, isDirectEmailDeliveryKind } from "@/modules/email/domain/email-delivery";
import { renderEmailDelivery } from "@/modules/email/infrastructure/email-template";
import { isPusanEmail } from "@/modules/identity/domain/user-role";

const MAX_ATTEMPTS = 5;
const STALE_LEASE_MS = 10 * 60 * 1_000;
const WORKER_LEASE_MS = 10 * 60 * 1_000;
const DAILY_LIMIT = 450;
const OPTIONAL_DAILY_LIMIT = 100;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000] as const;
const WORKER_NAME = "gmail-smtp";

type ClaimedRow = ClaimedEmailDelivery & { attempts: number };

type DeliveryPermission = { allowed: true } | { allowed: false; reason: string };

export type EmailWorkerResult = {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  deferred: number;
  canceled: number;
  skipped: boolean;
  authenticationFailed: boolean;
};

export class PrismaEmailDeliveryWorker {
  private readonly ownerId = randomUUID();

  constructor(
    private readonly client: PrismaClient,
    private readonly transport: EmailTransport,
    private readonly appUrl: string,
  ) {}

  async processBatch(limit = 25, now = new Date()): Promise<EmailWorkerResult> {
    const result: EmailWorkerResult = { claimed: 0, sent: 0, retried: 0, failed: 0, deferred: 0, canceled: 0, skipped: false, authenticationFailed: false };
    if (!await this.acquireLease(now)) {
      result.skipped = true;
      return result;
    }
    try {
      const since = new Date(now.getTime() - 86_400_000);
      const [sentHistory, optionalSentHistory] = await Promise.all([
        this.client.emailDelivery.findMany({ where: { status: "SENT", sentAt: { gte: since } }, select: { sentAt: true }, orderBy: { sentAt: "asc" } }),
        this.client.emailDelivery.findMany({ where: { status: "SENT", optional: true, sentAt: { gte: since } }, select: { sentAt: true }, orderBy: { sentAt: "asc" } }),
      ]);
      const sentCount = sentHistory.length;
      const optionalSentCount = optionalSentHistory.length;
      const remaining = Math.max(0, DAILY_LIMIT - sentCount);
      if (remaining === 0) {
        result.deferred = await this.deferQueuedForQuota(now, nextAvailableAt(sentHistory, now));
        return result;
      }
      if (optionalSentCount >= OPTIONAL_DAILY_LIMIT) {
        result.deferred += await this.deferQueuedForQuota(now, nextAvailableAt(optionalSentHistory, now), true);
      }
      const jobs = await this.claim(Math.min(Math.max(1, Math.trunc(limit)), 25, remaining), now, optionalSentCount < OPTIONAL_DAILY_LIMIT);
      result.claimed = jobs.length;
      let totalSent = sentCount;
      let optionalSent = optionalSentCount;
      for (let index = 0; index < jobs.length; index += 1) {
        const job = jobs[index]!;
        if (!await this.renewLease()) {
          await this.releaseClaimed(jobs.slice(index).map(({ id }) => id), new Date());
          result.skipped = true;
          break;
        }
        if (totalSent >= DAILY_LIMIT || (job.optional && optionalSent >= OPTIONAL_DAILY_LIMIT)) {
          if (!await this.deferForQuota(job.id, nextAvailableAt(job.optional ? optionalSentHistory : sentHistory, new Date()))) {
            result.skipped = true;
            break;
          }
          logDeliveryTransition(job, "RETRY_WAIT", "DAILY_EMAIL_LIMIT_REACHED");
          result.deferred += 1;
          continue;
        }
        try {
          const permission = await this.checkDeliveryPermission(job);
          if (!permission.allowed) {
            if (!await this.cancel(job.id)) {
              result.skipped = true;
              break;
            }
            logDeliveryTransition(job, "CANCELED", permission.reason);
            result.canceled += 1;
            continue;
          }
          const sent = await this.transport.send(job, renderEmailDelivery(job, this.appUrl));
          if (!await this.markSent(job.id, new Date(), sent.providerMessageId)) {
            result.skipped = true;
            break;
          }
          logDeliveryTransition(job, "SENT");
          result.sent += 1;
          totalSent += 1;
          if (job.optional) optionalSent += 1;
        } catch (error) {
          const failedAt = new Date();
          const classification = classifyEmailError(error);
          if (classification === "AUTH") {
            const releasedCurrent = await this.releaseAuthenticationFailure(job.id, failedAt, error);
            await this.releaseClaimed(jobs.slice(index + 1).map(({ id }) => id), failedAt);
            if (releasedCurrent) {
              logDeliveryTransition(job, "RETRY_WAIT", errorCode(error));
              for (const remainingJob of jobs.slice(index + 1)) logDeliveryTransition(remainingJob, "RETRY_WAIT", "GMAIL_AUTHENTICATION_UNAVAILABLE");
            } else {
              result.skipped = true;
            }
            result.authenticationFailed = true;
            result.retried += Number(releasedCurrent);
            break;
          }
          if (classification === "QUOTA") {
            if (!await this.deferForQuota(job.id, new Date(failedAt.getTime() + 60 * 60_000), error)) {
              result.skipped = true;
              break;
            }
            logDeliveryTransition(job, "RETRY_WAIT", errorCode(error));
            result.deferred += 1;
            continue;
          }
          if (classification === "PERMANENT" || job.attempts >= MAX_ATTEMPTS) {
            if (!await this.fail(job.id, error)) {
              result.skipped = true;
              break;
            }
            logDeliveryTransition(job, "FAILED", errorCode(error));
            result.failed += 1;
            continue;
          }
          if (!await this.retry(job.id, job.attempts, failedAt, error)) {
            result.skipped = true;
            break;
          }
          logDeliveryTransition(job, "RETRY_WAIT", errorCode(error));
          result.retried += 1;
        }
      }
      return result;
    } finally {
      await this.releaseLease();
      await this.transport.close?.();
    }
  }

  private async acquireLease(now: Date) {
    const lockedUntil = new Date(now.getTime() + WORKER_LEASE_MS);
    return this.client.$transaction(async (transaction) => {
      const advisory = await transaction.$queryRaw<Array<{ acquired: boolean }>>(Prisma.sql`
        SELECT pg_try_advisory_xact_lock(hashtext(${WORKER_NAME})) AS "acquired"
      `);
      if (!advisory[0]?.acquired) return false;
      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "email_worker_lease" ("name", "ownerId", "lockedUntil", "updatedAt")
        VALUES (${WORKER_NAME}, ${this.ownerId}, ${now}, ${now})
        ON CONFLICT ("name") DO NOTHING
      `);
      const result = await transaction.$queryRaw<Array<{ name: string }>>(Prisma.sql`
        UPDATE "email_worker_lease"
        SET "ownerId" = ${this.ownerId}, "lockedUntil" = ${lockedUntil}, "updatedAt" = ${now}
        WHERE "name" = ${WORKER_NAME} AND "lockedUntil" <= ${now}
        RETURNING "name"
      `);
      return result.length === 1;
    });
  }

  private releaseLease() {
    return this.client.emailWorkerLease.updateMany({
      where: { name: WORKER_NAME, ownerId: this.ownerId },
      data: { ownerId: null, lockedUntil: new Date() },
    }).catch(() => ({ count: 0 }));
  }

  private renewLease() {
    const now = new Date();
    return this.client.emailWorkerLease.updateMany({
      where: { name: WORKER_NAME, ownerId: this.ownerId, lockedUntil: { gt: now } },
      data: { lockedUntil: new Date(now.getTime() + WORKER_LEASE_MS) },
    }).then(({ count }) => count === 1);
  }

  private claim(limit: number, now: Date, includeOptional: boolean): Promise<ClaimedRow[]> {
    const staleAt = new Date(now.getTime() - STALE_LEASE_MS);
    return this.client.$queryRaw<ClaimedRow[]>(Prisma.sql`
      WITH candidates AS (
        SELECT "id"
        FROM "email_delivery"
        WHERE (
          ("status" IN ('PENDING'::"EmailDeliveryStatus", 'RETRY_WAIT'::"EmailDeliveryStatus") AND "availableAt" <= ${now})
          OR ("status" = 'PROCESSING'::"EmailDeliveryStatus" AND "lockedAt" <= ${staleAt})
        )
        AND (${includeOptional} OR "optional" = false)
        ORDER BY "priority" DESC, "createdAt" ASC, "id" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE "email_delivery" AS delivery
      SET "status" = 'PROCESSING'::"EmailDeliveryStatus",
          "lockedAt" = ${now},
          "lockedBy" = ${this.ownerId},
          "attempts" = delivery."attempts" + 1,
          "updatedAt" = ${now}
      FROM candidates
      WHERE delivery."id" = candidates."id"
      RETURNING delivery."id", delivery."kind", delivery."recipientUserId", delivery."recipientType", delivery."recipientEmail", delivery."locale", delivery."title", delivery."body", delivery."titleEn", delivery."bodyEn", delivery."href", delivery."optional", delivery."allowInactiveRecipient", delivery."lockedBy", delivery."attempts"
    `);
  }

  private async checkDeliveryPermission(job: ClaimedRow): Promise<DeliveryPermission> {
    if (job.recipientType === "DIRECT") {
      return isDirectEmailDeliveryKind(job.kind)
        ? { allowed: true }
        : { allowed: false, reason: "DIRECT_RECIPIENT_KIND_NOT_ALLOWED" };
    }
    if (!job.recipientUserId) return { allowed: false, reason: "REGISTERED_RECIPIENT_MISSING" };
    const recipient = await this.client.user.findUnique({
      where: { id: job.recipientUserId },
      select: {
        email: true,
        emailVerified: true,
        accountStatus: true,
        emailPreference: { select: { reportActivityEnabled: true, discussionEnabled: true, programActivityEnabled: true } },
      },
    });
    if (!recipient || !recipient.emailVerified || !isPusanEmail(recipient.email)) {
      return { allowed: false, reason: "RECIPIENT_EMAIL_NO_LONGER_ELIGIBLE" };
    }
    if (recipient.accountStatus !== "ACTIVE" && !job.allowInactiveRecipient) {
      return { allowed: false, reason: "RECIPIENT_ACCOUNT_INACTIVE" };
    }
    if (!emailPreferenceAllows(job.kind, recipient.emailPreference)) {
      return { allowed: false, reason: `${job.kind}_EMAIL_DISABLED` };
    }
    return { allowed: true };
  }

  private retry(id: string, attempts: number, failedAt: Date, error: unknown) {
    const delay = RETRY_DELAYS_MS[Math.min(Math.max(0, attempts - 1), RETRY_DELAYS_MS.length - 1)]!;
    return this.transitionClaimed(id, {
      status: "RETRY_WAIT",
      lockedAt: null,
      lockedBy: null,
      availableAt: new Date(failedAt.getTime() + delay),
      lastError: sanitizeError(error),
    });
  }

  private fail(id: string, error: unknown) {
    return this.transitionClaimed(id, {
      status: "FAILED",
      lockedAt: null,
      lockedBy: null,
      lastError: sanitizeError(error),
    });
  }

  private cancel(id: string) {
    return this.transitionClaimed(id, {
      status: "CANCELED",
      lockedAt: null,
      lockedBy: null,
      title: null,
      body: null,
      titleEn: null,
      bodyEn: null,
      href: null,
      lastError: null,
    });
  }

  private deferForQuota(id: string, availableAt: Date, error?: unknown) {
    return this.transitionClaimed(id, {
      status: "RETRY_WAIT",
      lockedAt: null,
      lockedBy: null,
      attempts: { decrement: 1 },
      availableAt,
      lastError: error ? sanitizeError(error) : "DAILY_EMAIL_LIMIT_REACHED",
    });
  }

  private deferQueuedForQuota(now: Date, availableAt: Date, optionalOnly = false) {
    return this.client.emailDelivery.updateMany({
      where: {
        status: { in: ["PENDING", "RETRY_WAIT"] },
        availableAt: { lte: now },
        ...(optionalOnly ? { optional: true } : {}),
      },
      data: { status: "RETRY_WAIT", availableAt, lastError: "DAILY_EMAIL_LIMIT_REACHED" },
    }).then(({ count }) => count);
  }

  private releaseAuthenticationFailure(id: string, now: Date, error: unknown) {
    return this.transitionClaimed(id, {
      status: "RETRY_WAIT",
      lockedAt: null,
      lockedBy: null,
      attempts: { decrement: 1 },
      availableAt: new Date(now.getTime() + 5 * 60_000),
      lastError: sanitizeError(error),
    });
  }

  private releaseClaimed(ids: string[], now: Date) {
    if (!ids.length) return Promise.resolve({ count: 0 });
    return this.client.emailDelivery.updateMany({
      where: { id: { in: ids }, status: "PROCESSING", lockedBy: this.ownerId },
      data: { status: "RETRY_WAIT", lockedAt: null, lockedBy: null, attempts: { decrement: 1 }, availableAt: new Date(now.getTime() + 5 * 60_000), lastError: "GMAIL_AUTHENTICATION_UNAVAILABLE" },
    });
  }

  private markSent(id: string, sentAt: Date, providerMessageId: string | null) {
    return this.transitionClaimed(id, {
      status: "SENT",
      sentAt,
      lockedAt: null,
      lockedBy: null,
      providerMessageId,
      title: null,
      body: null,
      titleEn: null,
      bodyEn: null,
      href: null,
      lastError: null,
    });
  }

  private transitionClaimed(id: string, data: Prisma.EmailDeliveryUpdateManyMutationInput) {
    return this.client.emailDelivery.updateMany({
      where: { id, status: "PROCESSING", lockedBy: this.ownerId },
      data,
    }).then(({ count }) => count === 1);
  }
}

function nextAvailableAt(history: Array<{ sentAt: Date | null }>, now: Date) {
  const earliest = history[0]?.sentAt;
  return earliest ? new Date(earliest.getTime() + 86_400_000) : new Date(now.getTime() + 60 * 60_000);
}

function classifyEmailError(error: unknown): "AUTH" | "QUOTA" | "PERMANENT" | "RETRY" {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid_grant|oauth|\b535\b|authentication|credentials/i.test(message)) return "AUTH";
  if (/\b550\s+5\.4\.5\b|daily.*limit|rate.*limit|quota/i.test(message)) return "QUOTA";
  const responseCode = typeof error === "object" && error !== null && "responseCode" in error
    ? Number((error as { responseCode?: unknown }).responseCode)
    : NaN;
  if (Number.isInteger(responseCode) && responseCode >= 500 && responseCode < 600) return "PERMANENT";
  return "RETRY";
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/[A-Za-z0-9_-]{20,}/g, "[redacted]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[redacted-email]")
    .slice(0, 500);
}

function errorCode(error: unknown) {
  const responseCode = typeof error === "object" && error !== null && "responseCode" in error
    ? Number((error as { responseCode?: unknown }).responseCode)
    : NaN;
  if (Number.isInteger(responseCode)) return `SMTP_${responseCode}`;
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid_grant|oauth|\b535\b|authentication|credentials/i.test(message)) return "GMAIL_AUTHENTICATION_FAILED";
  if (/timeout|socket|network|econn/i.test(message)) return "SMTP_NETWORK_ERROR";
  return "EMAIL_DELIVERY_ERROR";
}

function logDeliveryTransition(
  delivery: Pick<ClaimedEmailDelivery, "id" | "kind">,
  status: "SENT" | "RETRY_WAIT" | "FAILED" | "CANCELED",
  errorCodeValue?: string,
) {
  console.info(JSON.stringify({
    event: "email_delivery_transition",
    deliveryId: delivery.id,
    kind: delivery.kind,
    status,
    ...(errorCodeValue ? { errorCode: errorCodeValue } : {}),
  }));
}
