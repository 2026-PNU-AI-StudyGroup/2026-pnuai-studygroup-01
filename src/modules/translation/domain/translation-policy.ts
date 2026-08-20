export const translationTargets = ["ko", "en"] as const;

export type TranslationTarget = (typeof translationTargets)[number];

export const MAX_TRANSLATION_TEXT_LENGTH = 8_000;

export class InvalidTranslationInputError extends Error {
  constructor(message = "번역할 내용을 확인해 주세요.") {
    super(message);
    this.name = "InvalidTranslationInputError";
  }
}

export function normalizeTranslationText(text: string): string {
  const normalized = text.trim();
  if (normalized.length === 0 || normalized.length > MAX_TRANSLATION_TEXT_LENGTH) {
    throw new InvalidTranslationInputError();
  }
  return normalized;
}

// 사용자 콘텐츠 자동 번역(Ollama)은 기본으로 끈다. 번역 품질이 낮아 원문보다 도움이 안 됐다.
// 화면 문구 번역(ui-messages.en.json)은 사람이 쓴 카탈로그라 이 설정과 무관하게 계속 동작한다.
// 다시 켜려면 USER_CONTENT_TRANSLATION_ENABLED=true 를 넣는다.
export function isUserContentTranslationEnabled(
  environment: Record<string, string | undefined>,
): boolean {
  return environment.USER_CONTENT_TRANSLATION_ENABLED === "true";
}
