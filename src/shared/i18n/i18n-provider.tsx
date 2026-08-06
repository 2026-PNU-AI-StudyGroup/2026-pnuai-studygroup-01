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

// Node's ICU renders ko-KR AM/PM as "AM"/"PM" instead of "오전"/"오후" when
// formatting via Intl (dateStyle/timeStyle or hour+minute alone), unlike
// browsers — causing a hydration mismatch. Passing `dayPeriod` explicitly
// "fixes" Node but switches both Node and the browser to a wider day-period
// vocabulary ("밤", "새벽", …) that changes the visible text late at night.
// Building the 오전/오후 prefix ourselves from the numeric hour keeps the
// exact original two-period format and matches on server and client.
function formatKoreanClock(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Seoul",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 || 12;
  return `${period} ${hour12}:${minute}`;
}

export function UiDate({
  value,
  mode = "date",
}: {
  value: Date | string;
  mode?: "date" | "dateTime" | "day" | "time";
}) {
  const { locale } = useI18n();
  const isKorean = locale === "ko";
  const date = new Date(value);

  if (isKorean && (mode === "time" || mode === "dateTime")) {
    const clock = formatKoreanClock(date);
    if (mode === "time") return <>{clock}</>;
    const datePart = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(date);
    return <>{datePart} {clock}</>;
  }

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
      {new Intl.DateTimeFormat(isKorean ? "ko-KR" : "en-US", {
        ...options,
        timeZone: "Asia/Seoul",
      }).format(date)}
    </>
  );
}
