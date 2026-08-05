import { translationSourceHash } from "@/modules/translation/application/translation-queue";
import {
  MAX_TRANSLATION_TEXT_LENGTH,
  type TranslationTarget,
} from "@/modules/translation/domain/translation-policy";

// 원문이 번역 한도를 넘으면 저장된 번역이 있을 수 없고, 해시 계산 시
// normalizeTranslationText가 throw하므로(읽기 경로에서 페이지 500) 조회 대상에서 제외한다.
function isTranslatableText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TRANSLATION_TEXT_LENGTH;
}

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
    if (!isTranslatableText(text)) return Promise.resolve(null);
    return this.reader.find(translationSourceHash(text), targetLocale);
  }

  async executeMany(
    texts: readonly string[],
    targetLocale: TranslationTarget,
  ): Promise<ReadonlyMap<string, string>> {
    const uniqueTexts = [...new Set(texts.filter(isTranslatableText))];
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
