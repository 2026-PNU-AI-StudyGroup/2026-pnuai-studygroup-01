import type { TranslationTarget } from "@/modules/translation/domain/translation-policy";
import { ReadStoredTranslationService } from "@/modules/translation/application/read-stored-translation";
import { isValidElement } from "react";

type JsonLikeObject = Record<string, unknown>;

function collectStrings(value: unknown, result: Set<string>, seen: WeakSet<object>): void {
  if (typeof value === "string") {
    if (value.trim()) result.add(value);
    return;
  }
  if (value === null || typeof value !== "object" || value instanceof Date) return;
  if (seen.has(value)) return;
  seen.add(value);

  if (isValidElement<{ children?: unknown }>(value)) {
    collectStrings(value.props, result, seen);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectStrings(entry, result, seen));
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return;
  Object.values(value as JsonLikeObject).forEach((entry) =>
    collectStrings(entry, result, seen),
  );
}

function replaceStrings<T>(
  value: T,
  translations: ReadonlyMap<string, string>,
  seen: WeakMap<object, unknown>,
): T {
  if (typeof value === "string") {
    return (translations.get(value) ?? value) as T;
  }
  if (value === null || typeof value !== "object" || value instanceof Date) return value;

  const cached = seen.get(value);
  if (cached !== undefined) return cached as T;

  if (Array.isArray(value)) {
    const localized: unknown[] = [];
    seen.set(value, localized);
    value.forEach((entry) => localized.push(replaceStrings(entry, translations, seen)));
    return localized as T;
  }

  const localized: JsonLikeObject = {};
  seen.set(value, localized);
  Object.entries(value as JsonLikeObject).forEach(([key, entry]) => {
    localized[key] = replaceStrings(entry, translations, seen);
  });
  return localized as T;
}

/**
 * Localizes a complete server-side view model with one DB lookup. Only strings
 * already present in the persisted translation table are replaced, so IDs,
 * enum values, URLs, emails, and other non-content strings remain untouched.
 */
export async function localizeStoredContent<T>(
  value: T,
  locale: TranslationTarget,
  service: ReadStoredTranslationService,
): Promise<T> {
  const strings = new Set<string>();
  collectStrings(value, strings, new WeakSet());
  const translations = await service.executeMany([...strings], locale);
  return replaceStrings(value, translations, new WeakMap());
}

export async function readStoredContentTranslations(
  value: unknown,
  locale: TranslationTarget,
  service: ReadStoredTranslationService,
): Promise<Record<string, string>> {
  const strings = new Set<string>();
  collectStrings(value, strings, new WeakSet());
  const candidates = [...strings].filter((text) =>
    locale === "en" ? /[가-힣]/.test(text) : /[A-Za-z]/.test(text) && !/[가-힣]/.test(text));
  return Object.fromEntries(await service.executeMany(candidates, locale));
}
