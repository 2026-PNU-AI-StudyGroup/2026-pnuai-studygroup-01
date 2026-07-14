export const translationTargets = ["ko", "en"] as const;

export type TranslationTarget = (typeof translationTargets)[number];

export class InvalidTranslationInputError extends Error {
  constructor(message = "번역할 내용을 확인해 주세요.") {
    super(message);
    this.name = "InvalidTranslationInputError";
  }
}

export function normalizeTranslationText(text: string): string {
  const normalized = text.trim();
  if (normalized.length === 0 || normalized.length > 2_000) {
    throw new InvalidTranslationInputError();
  }
  return normalized;
}
