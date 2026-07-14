import {
  normalizeTranslationText,
  type TranslationTarget,
} from "@/modules/translation/domain/translation-policy";

export interface TranslationEngine {
  translate(input: { text: string; target: TranslationTarget }): Promise<string>;
}

export class TranslationUnavailableError extends Error {
  constructor() {
    super("로컬 번역 모델을 사용할 수 없습니다. Ollama 실행 상태를 확인해 주세요.");
    this.name = "TranslationUnavailableError";
  }
}

export class TranslateTextService {
  constructor(private readonly engine: TranslationEngine) {}

  async execute(input: { text: string; target: TranslationTarget }): Promise<string> {
    const translated = await this.engine.translate({
      text: normalizeTranslationText(input.text),
      target: input.target,
    });
    const normalized = translated.trim();
    if (normalized.length === 0 || normalized.length > 8_000) {
      throw new TranslationUnavailableError();
    }
    return normalized;
  }
}
