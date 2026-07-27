import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processBatch: vi.fn(),
}));

vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {} }));
vi.mock(
  "@/modules/translation/infrastructure/ollama-translation-engine",
  () => ({
    OllamaTranslationEngine: class {},
  }),
);
vi.mock(
  "@/modules/translation/infrastructure/prisma-translation-queue-worker",
  () => ({
    PrismaTranslationQueueWorker: class {
      processBatch = mocks.processBatch;
    },
  }),
);

import { POST } from "@/app/api/cron/translations/route";

const previousSecret = process.env.CRON_SECRET;

afterEach(() => {
  process.env.CRON_SECRET = previousSecret;
});

describe("translation queue cron API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.processBatch.mockResolvedValue({
      claimed: 2,
      succeeded: 2,
      retried: 0,
      failed: 0,
    });
  });

  it("does not expose the worker when the shared cron secret is missing", async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(
      new Request("http://localhost/api/cron/translations", { method: "POST" }),
    );

    expect(response.status).toBe(503);
    expect(mocks.processBatch).not.toHaveBeenCalled();
  });

  it("rejects an invalid bearer token", async () => {
    process.env.CRON_SECRET =
      "a-secure-random-cron-secret-with-48-characters-1234";

    const response = await POST(
      new Request("http://localhost/api/cron/translations", {
        method: "POST",
        headers: { authorization: "Bearer wrong" },
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.processBatch).not.toHaveBeenCalled();
  });

  it("runs one bounded batch for an authorized request", async () => {
    process.env.CRON_SECRET =
      "a-secure-random-cron-secret-with-48-characters-1234";

    const response = await POST(
      new Request("http://localhost/api/cron/translations", {
        method: "POST",
        headers: {
          authorization:
            "Bearer a-secure-random-cron-secret-with-48-characters-1234",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      claimed: 2,
      succeeded: 2,
      retried: 0,
      failed: 0,
    });
    expect(mocks.processBatch).toHaveBeenCalledWith(10);
  });
});
