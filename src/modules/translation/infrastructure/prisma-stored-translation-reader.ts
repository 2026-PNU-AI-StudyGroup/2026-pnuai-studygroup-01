import type { PrismaClient } from "@/generated/prisma/client";
import type { StoredTranslationReader } from "@/modules/translation/application/read-stored-translation";
import type { TranslationTarget } from "@/modules/translation/domain/translation-policy";

export class PrismaStoredTranslationReader implements StoredTranslationReader {
  constructor(private readonly client: PrismaClient) {}

  async find(sourceHash: string, targetLocale: TranslationTarget): Promise<string | null> {
    const stored = await this.client.storedTranslation.findUnique({
      where: {
        sourceHash_targetLocale: {
          sourceHash,
          targetLocale,
        },
      },
      select: { text: true },
    });
    return stored?.text ?? null;
  }

  async findMany(
    sourceHashes: readonly string[],
    targetLocale: TranslationTarget,
  ): Promise<ReadonlyMap<string, string>> {
    if (sourceHashes.length === 0) return new Map();

    const stored = await this.client.storedTranslation.findMany({
      where: {
        sourceHash: { in: [...sourceHashes] },
        targetLocale,
      },
      select: { sourceHash: true, text: true },
    });
    return new Map(stored.map(({ sourceHash, text }) => [sourceHash, text]));
  }
}
