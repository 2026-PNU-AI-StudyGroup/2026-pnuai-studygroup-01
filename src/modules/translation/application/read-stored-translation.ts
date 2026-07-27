import { translationSourceHash } from "@/modules/translation/application/translation-queue";
import type { TranslationTarget } from "@/modules/translation/domain/translation-policy";

export interface StoredTranslationReader {
  find(sourceHash: string, targetLocale: TranslationTarget): Promise<string | null>;
  findMany(
    sourceHashes: readonly string[],
    targetLocale: TranslationTarget,
  ): Promise<ReadonlyMap<string, string>>;
}

export class ReadStoredTranslationService {
  constructor(private readonly reader: StoredTranslationReader) {}

  execute(text: string, targetLocale: TranslationTarget): Promise<string | null> {
    return this.reader.find(translationSourceHash(text), targetLocale);
  }

  async executeMany(
    texts: readonly string[],
    targetLocale: TranslationTarget,
  ): Promise<ReadonlyMap<string, string>> {
    const uniqueTexts = [...new Set(texts.filter((text) => text.trim().length > 0))];
    const hashByText = new Map(
      uniqueTexts.map((text) => [text, translationSourceHash(text)] as const),
    );
    const translations = await this.reader.findMany(
      [...new Set(hashByText.values())],
      targetLocale,
    );

    return new Map(
      uniqueTexts.flatMap((text) => {
        const translation = translations.get(hashByText.get(text)!);
        return translation === undefined ? [] : [[text, translation] as const];
      }),
    );
  }
}
