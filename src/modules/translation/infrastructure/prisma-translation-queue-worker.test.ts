import type { PrismaClient } from "@/generated/prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TranslationEngine } from "@/modules/translation/application/translate-text";
import { PrismaTranslationQueueWorker } from "@/modules/translation/infrastructure/prisma-translation-queue-worker";

type ClaimedRow = {
  id: string;
  sourceHash: string;
  targetLocale: string;
  attempts: number;
  text: string;
};

function createFixture(rows: ClaimedRow[]) {
  const updateMany = vi.fn().mockResolvedValue({ count: 0 });
  const queryRaw = vi.fn().mockResolvedValue(rows);
  const upsert = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue({});
  const transaction = vi.fn(async (input: unknown) => {
    if (typeof input === "function") {
      return input({
        translationJob: { updateMany },
        $queryRaw: queryRaw,
      });
    }
    return Promise.all(input as Promise<unknown>[]);
  });
  const client = {
    $transaction: transaction,
    storedTranslation: { upsert },
    translationJob: { update },
  } as unknown as PrismaClient;
  return { client, updateMany, queryRaw, upsert, update, transaction };
}

describe("PrismaTranslationQueueWorker", () => {
  const now = new Date("2026-07-25T00:00:00.000Z");

  beforeEach(() => {
    vi.useRealTimers();
  });

  it("recovers stale leases and persists a successful translation atomically", async () => {
    const fixture = createFixture([
      {
        id: "job-1",
        sourceHash: "source-hash",
        targetLocale: "en",
        attempts: 1,
        text: "졸업 프로젝트",
      },
    ]);
    const engine: TranslationEngine = {
      translate: vi.fn().mockResolvedValue("Graduation project"),
    };

    const result = await new PrismaTranslationQueueWorker(
      fixture.client,
      engine,
      "qwen",
    ).processBatch(10, now);

    expect(result).toEqual({ claimed: 1, succeeded: 1, retried: 0, failed: 0 });
    expect(fixture.updateMany).toHaveBeenCalledWith({
      where: {
        status: "PROCESSING",
        lockedAt: { lt: new Date("2026-07-24T23:50:00.000Z") },
      },
      data: { status: "PENDING", lockedAt: null, availableAt: now },
    });
    expect(fixture.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          sourceHash_targetLocale: {
            sourceHash: "source-hash",
            targetLocale: "en",
          },
        },
        create: expect.objectContaining({
          text: "Graduation project",
          model: "qwen",
        }),
      }),
    );
    expect(fixture.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "SUCCEEDED", lockedAt: null, lastError: null },
    });
    expect(fixture.transaction).toHaveBeenCalledTimes(2);
  });

  it("requeues a transient failure with exponential backoff", async () => {
    const fixture = createFixture([
      {
        id: "job-2",
        sourceHash: "source-hash",
        targetLocale: "ko",
        attempts: 2,
        text: "Graduation project",
      },
    ]);
    const engine: TranslationEngine = {
      translate: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
    };

    const result = await new PrismaTranslationQueueWorker(
      fixture.client,
      engine,
      "qwen",
    ).processBatch(10, now);

    expect(result).toEqual({ claimed: 1, succeeded: 0, retried: 1, failed: 0 });
    expect(fixture.update).toHaveBeenCalledWith({
      where: { id: "job-2" },
      data: {
        status: "PENDING",
        lockedAt: null,
        lastError: "LLM unavailable",
        availableAt: new Date("2026-07-25T00:01:00.000Z"),
      },
    });
  });

  it("marks the fifth failed attempt as terminal and truncates its error", async () => {
    const fixture = createFixture([
      {
        id: "job-3",
        sourceHash: "source-hash",
        targetLocale: "en",
        attempts: 5,
        text: "졸업 프로젝트",
      },
    ]);
    const longMessage = "x".repeat(1_100);
    const engine: TranslationEngine = {
      translate: vi.fn().mockRejectedValue(new Error(longMessage)),
    };

    const result = await new PrismaTranslationQueueWorker(
      fixture.client,
      engine,
      "qwen",
    ).processBatch(10, now);

    expect(result).toEqual({ claimed: 1, succeeded: 0, retried: 0, failed: 1 });
    expect(fixture.update).toHaveBeenCalledWith({
      where: { id: "job-3" },
      data: {
        status: "FAILED",
        lockedAt: null,
        lastError: "x".repeat(1_000),
      },
    });
  });

  it("fails a corrupt target locale without blocking the batch", async () => {
    const fixture = createFixture([
      {
        id: "job-4",
        sourceHash: "source-hash",
        targetLocale: "ja",
        attempts: 1,
        text: "프로젝트",
      },
    ]);
    const engine: TranslationEngine = {
      translate: vi.fn(),
    };

    const result = await new PrismaTranslationQueueWorker(
      fixture.client,
      engine,
      "qwen",
    ).processBatch(10, now);

    // poison pill이 배치 전체를 막지 않고 해당 작업만 FAILED 처리한다.
    expect(result).toEqual({ claimed: 0, succeeded: 0, retried: 0, failed: 0 });
    expect(engine.translate).not.toHaveBeenCalled();
    expect(fixture.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["job-4"] } },
      data: { status: "FAILED", lockedAt: null, lastError: "Unsupported translation target" },
    });
  });
});
