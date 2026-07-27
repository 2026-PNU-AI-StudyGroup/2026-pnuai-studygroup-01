import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ClaimedTranslationJob,
} from "@/modules/translation/application/translation-queue";
import {
  TranslateTextService,
  type TranslationEngine,
} from "@/modules/translation/application/translate-text";
import type { TranslationTarget } from "@/modules/translation/domain/translation-policy";

const MAX_ATTEMPTS = 5;
const STALE_LEASE_MS = 10 * 60 * 1_000;
const CONCURRENCY = 1;

type ClaimedRow = {
  id: string;
  sourceHash: string;
  targetLocale: string;
  attempts: number;
  text: string;
};

export class PrismaTranslationQueueWorker {
  constructor(
    private readonly client: PrismaClient,
    private readonly engine: TranslationEngine,
    private readonly model: string,
  ) {}

  async processBatch(limit = 10, now = new Date()): Promise<{
    claimed: number;
    succeeded: number;
    retried: number;
    failed: number;
  }> {
    const normalizedLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
    const jobs = await this.claim(normalizedLimit, now);
    const result = { claimed: jobs.length, succeeded: 0, retried: 0, failed: 0 };

    for (let offset = 0; offset < jobs.length; offset += CONCURRENCY) {
      await Promise.all(jobs.slice(offset, offset + CONCURRENCY).map(async (job) => {
        try {
          const text = await new TranslateTextService(this.engine).execute({
            text: job.text,
            target: job.targetLocale,
          });
          await this.client.$transaction([
            this.client.storedTranslation.upsert({
              where: {
                sourceHash_targetLocale: {
                  sourceHash: job.sourceHash,
                  targetLocale: job.targetLocale,
                },
              },
              create: {
                sourceHash: job.sourceHash,
                targetLocale: job.targetLocale,
                text,
                model: this.model,
                translatedAt: new Date(),
              },
              update: {
                text,
                model: this.model,
                translatedAt: new Date(),
              },
            }),
            this.client.translationJob.update({
              where: { id: job.id },
              data: { status: "SUCCEEDED", lockedAt: null, lastError: null },
            }),
          ]);
          result.succeeded += 1;
        } catch (error) {
          const terminal = job.attempts >= MAX_ATTEMPTS;
          const message =
            error instanceof Error
              ? error.message.slice(0, 1_000)
              : "Unknown translation error";
          await this.client.translationJob.update({
            where: { id: job.id },
            data: terminal
              ? { status: "FAILED", lockedAt: null, lastError: message }
              : {
                  status: "PENDING",
                  lockedAt: null,
                  lastError: message,
                  availableAt: new Date(
                    now.getTime() + retryDelayMs(job.attempts),
                  ),
                },
          });
          if (terminal) result.failed += 1;
          else result.retried += 1;
        }
      }));
    }
    return result;
  }

  private async claim(limit: number, now: Date): Promise<ClaimedTranslationJob[]> {
    const staleBefore = new Date(now.getTime() - STALE_LEASE_MS);
    return this.client.$transaction(async (transaction) => {
      await transaction.translationJob.updateMany({
        where: { status: "PROCESSING", lockedAt: { lt: staleBefore } },
        data: { status: "PENDING", lockedAt: null, availableAt: now },
      });
      const rows = await transaction.$queryRaw<ClaimedRow[]>(Prisma.sql`
        WITH claimable AS (
          SELECT "id"
          FROM "translation_job"
          WHERE "status" = 'PENDING'::"TranslationJobStatus"
            AND "availableAt" <= ${now}
          ORDER BY "availableAt" ASC, "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        )
        UPDATE "translation_job" AS job
        SET
          "status" = 'PROCESSING'::"TranslationJobStatus",
          "lockedAt" = ${now},
          "attempts" = job."attempts" + 1,
          "updatedAt" = ${now}
        FROM claimable, "translation_source" AS source
        WHERE job."id" = claimable."id"
          AND source."hash" = job."sourceHash"
        RETURNING
          job."id",
          job."sourceHash",
          job."targetLocale",
          job."attempts",
          source."text"
      `);
      return rows.map((row) => ({
        ...row,
        targetLocale: assertTarget(row.targetLocale),
      }));
    });
  }
}

function assertTarget(value: string): TranslationTarget {
  if (value === "ko" || value === "en") return value;
  throw new Error(`Unsupported translation target: ${value}`);
}

function retryDelayMs(attempts: number): number {
  return Math.min(30 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1));
}
