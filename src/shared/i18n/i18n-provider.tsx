"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import type { SiteLocale } from "@/shared/i18n/site-locale";
import { translateUiMessage } from "@/shared/i18n/ui-message-catalog";

type I18nContextValue = {
  locale: SiteLocale;
  t: (message: string) => string;
  storedTranslations: Readonly<Record<string, string>>;
};

function translateStoredMessage(
  message: string,
  storedTranslations: Readonly<Record<string, string>>,
): string | undefined {
  const exact = storedTranslations[message];
  if (exact !== undefined) return exact;

  const sources = Object.keys(storedTranslations)
    .filter((source) => source.length > 0 && message.includes(source))
    .sort((left, right) => right.length - left.length);
  if (sources.length === 0) return undefined;

  return sources.reduce(
    (result, source) => replaceDelimitedSource(
      result,
      source,
      storedTranslations[source],
    ),
    message,
  );
}

function replaceDelimitedSource(
  message: string,
  source: string,
  translation: string,
): string {
  const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapedSource}(?=$|[^\\p{L}\\p{N}])`,
    "gu",
  );
  return message.replace(pattern, (_match, prefix: string) => (
    `${prefix}${translation}`
  ));
}

const I18nContext = createContext<I18nContextValue>({
  locale: "ko",
  t: (message) => message,
  storedTranslations: {},
});

export function I18nProvider({
  locale,
  storedTranslations = {},
  children,
}: {
  locale: SiteLocale;
  storedTranslations?: Readonly<Record<string, string>>;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      storedTranslations,
      t: (message) => translateUiMessage(
        locale,
        translateStoredMessage(message, storedTranslations) ?? message,
      ),
    }),
    [locale, storedTranslations],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

export function UiText({ children }: { children: ReactNode }) {
  const { locale, storedTranslations, t } = useI18n();
  if (typeof children !== "string") return <>{children}</>;
  const stored = translateStoredMessage(children, storedTranslations);
  return <>{stored === undefined ? t(children) : translateUiMessage(locale, stored)}</>;
}

export function UiDate({
  value,
  mode = "date",
}: {
  value: Date | string;
  mode?: "date" | "dateTime" | "day" | "time";
}) {
  const { locale } = useI18n();
  const options: Intl.DateTimeFormatOptions =
    mode === "dateTime"
      ? { dateStyle: "medium", timeStyle: "short" }
      : mode === "day"
        ? {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          }
        : mode === "time"
          ? { hour: "numeric", minute: "2-digit" }
          : { dateStyle: "medium" };
  return (
    <>
      {new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
        ...options,
        timeZone: "Asia/Seoul",
      }).format(new Date(value))}
    </>
  );
}
