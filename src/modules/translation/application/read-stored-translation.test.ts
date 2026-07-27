import { describe, expect, it, vi } from "vitest";

import { translationSourceHash } from "@/modules/translation/application/translation-queue";
import {
  ReadStoredTranslationService,
  type StoredTranslationReader,
} from "@/modules/translation/application/read-stored-translation";

describe("ReadStoredTranslationService", () => {
  it("trims the source text before looking up its persisted translation", async () => {
    const reader: StoredTranslationReader = {
      find: vi.fn().mockResolvedValue("Graduation project"),
      findMany: vi.fn(),
    };

    const result = await new ReadStoredTranslationService(reader).execute(
      "  졸업   프로젝트  ",
      "en",
    );

    expect(result).toBe("Graduation project");
    expect(reader.find).toHaveBeenCalledWith(
      translationSourceHash("졸업   프로젝트"),
      "en",
    );
  });

  it("loads a deduplicated batch and maps translations back to source text", async () => {
    const first = "졸업 프로젝트";
    const second = "필수 기술";
    const reader: StoredTranslationReader = {
      find: vi.fn(),
      findMany: vi.fn().mockResolvedValue(new Map([
        [translationSourceHash(first), "Graduation project"],
        [translationSourceHash(second), "Required skills"],
      ])),
    };

    await expect(
      new ReadStoredTranslationService(reader).executeMany(
        [first, second, first, "   "],
        "en",
      ),
    ).resolves.toEqual(new Map([
      [first, "Graduation project"],
      [second, "Required skills"],
    ]));
    expect(reader.findMany).toHaveBeenCalledWith(
      [translationSourceHash(first), translationSourceHash(second)],
      "en",
    );
  });
});
