import { describe, expect, it, vi } from "vitest";

import {
  localizeStoredContent,
  readStoredContentTranslations,
} from "@/modules/translation/application/localize-stored-content";
import { ReadStoredTranslationService } from "@/modules/translation/application/read-stored-translation";

describe("stored content localization", () => {
  it("replaces translated strings throughout a view model while preserving dates", async () => {
    const date = new Date("2026-07-25T00:00:00Z");
    const service = {
      executeMany: vi.fn().mockResolvedValue(new Map([
        ["한국어 제목", "English title"],
        ["기술", "Skill"],
      ])),
    } as unknown as ReadStoredTranslationService;

    await expect(localizeStoredContent(
      { title: "한국어 제목", values: ["기술"], date, status: "OPEN" },
      "en",
      service,
    )).resolves.toEqual({
      title: "English title",
      values: ["Skill"],
      date,
      status: "OPEN",
    });
  });

  it("returns the original-to-translation dictionary needed by the UI provider", async () => {
    const service = {
      executeMany: vi.fn().mockResolvedValue(new Map([
        ["한국어 제목", "English title"],
      ])),
    } as unknown as ReadStoredTranslationService;

    await expect(
      readStoredContentTranslations(
        { title: "한국어 제목", nested: ["설명"] },
        "en",
        service,
      ),
    ).resolves.toEqual({ "한국어 제목": "English title" });
    expect(service.executeMany).toHaveBeenCalledWith(
      expect.arrayContaining(["한국어 제목", "설명"]),
      "en",
    );
  });

  it("does not apply model output to content already written in the target language", async () => {
    const service = {
      executeMany: vi.fn().mockResolvedValue(new Map()),
    } as unknown as ReadStoredTranslationService;

    await readStoredContentTranslations(
      { korean: "원래 문장", english: "Original sentence" },
      "ko",
      service,
    );

    expect(service.executeMany).toHaveBeenCalledWith(
      ["Original sentence"],
      "ko",
    );
  });

  it("handles arrays, repeated references, and empty values without duplicate work", async () => {
    const shared = { text: "반복 문장" };
    const service = {
      executeMany: vi.fn().mockResolvedValue(new Map([
        ["반복 문장", "Repeated sentence"],
      ])),
    } as unknown as ReadStoredTranslationService;

    await expect(localizeStoredContent(
      [shared, shared, null, "", new Date("2026-01-01T00:00:00Z")],
      "en",
      service,
    )).resolves.toMatchObject([
      { text: "Repeated sentence" },
      { text: "Repeated sentence" },
      null,
      "",
      expect.any(Date),
    ]);
    expect(service.executeMany).toHaveBeenCalledWith(["반복 문장"], "en");
  });
});
