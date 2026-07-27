import { describe, expect, it, vi } from "vitest";

import {
  enqueueTranslations,
  translationSourceHash,
  type TranslationQueueClient,
} from "@/modules/translation/application/translation-queue";

describe("번역 큐 등록", () => {
  it("정규화된 원문을 해시로 중복 제거하고 한영 작업을 함께 등록한다", async () => {
    const translationSource = { createMany: vi.fn(async () => ({ count: 2 })) };
    const translationJob = { createMany: vi.fn(async () => ({ count: 4 })) };
    const client = { translationSource, translationJob } as unknown as TranslationQueueClient;

    await enqueueTranslations(client, [" 첫 번째 ", "첫 번째", "", null, "second"]);

    expect(translationSource.createMany).toHaveBeenCalledWith({
      data: [
        { hash: translationSourceHash("첫 번째"), text: "첫 번째" },
        { hash: translationSourceHash("second"), text: "second" },
      ],
      skipDuplicates: true,
    });
    expect(translationJob.createMany).toHaveBeenCalledWith({
      data: [
        { sourceHash: translationSourceHash("첫 번째"), targetLocale: "ko" },
        { sourceHash: translationSourceHash("첫 번째"), targetLocale: "en" },
        { sourceHash: translationSourceHash("second"), targetLocale: "ko" },
        { sourceHash: translationSourceHash("second"), targetLocale: "en" },
      ],
      skipDuplicates: true,
    });
  });

  it("빈 목록은 DB를 호출하지 않는다", async () => {
    const translationSource = { createMany: vi.fn() };
    const translationJob = { createMany: vi.fn() };
    const client = { translationSource, translationJob } as unknown as TranslationQueueClient;

    await enqueueTranslations(client, [" ", undefined]);

    expect(translationSource.createMany).not.toHaveBeenCalled();
    expect(translationJob.createMany).not.toHaveBeenCalled();
  });
});
