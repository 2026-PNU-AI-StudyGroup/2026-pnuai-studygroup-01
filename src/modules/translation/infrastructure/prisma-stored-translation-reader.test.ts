import type { PrismaClient } from "@/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";

import { PrismaStoredTranslationReader } from "@/modules/translation/infrastructure/prisma-stored-translation-reader";

describe("PrismaStoredTranslationReader", () => {
  it("reads a translation by its source hash and target locale", async () => {
    const findUnique = vi.fn().mockResolvedValue({ text: "Project" });
    const client = {
      storedTranslation: { findUnique },
    } as unknown as PrismaClient;

    await expect(
      new PrismaStoredTranslationReader(client).find("hash", "en"),
    ).resolves.toBe("Project");
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        sourceHash_targetLocale: {
          sourceHash: "hash",
          targetLocale: "en",
        },
      },
      select: { text: true },
    });
  });

  it("returns null when the translation has not been produced yet", async () => {
    const client = {
      storedTranslation: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;

    await expect(
      new PrismaStoredTranslationReader(client).find("missing", "ko"),
    ).resolves.toBeNull();
  });

  it("reads a batch in one query", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { sourceHash: "first", text: "First" },
      { sourceHash: "second", text: "Second" },
    ]);
    const client = {
      storedTranslation: { findMany },
    } as unknown as PrismaClient;

    await expect(
      new PrismaStoredTranslationReader(client).findMany(
        ["first", "second"],
        "en",
      ),
    ).resolves.toEqual(new Map([
      ["first", "First"],
      ["second", "Second"],
    ]));
    expect(findMany).toHaveBeenCalledWith({
      where: {
        sourceHash: { in: ["first", "second"] },
        targetLocale: "en",
      },
      select: { sourceHash: true, text: true },
    });
  });

  it("does not query for an empty batch", async () => {
    const findMany = vi.fn();
    const client = {
      storedTranslation: { findMany },
    } as unknown as PrismaClient;

    await expect(
      new PrismaStoredTranslationReader(client).findMany([], "en"),
    ).resolves.toEqual(new Map());
    expect(findMany).not.toHaveBeenCalled();
  });
});
