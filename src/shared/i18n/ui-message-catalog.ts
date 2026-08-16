import type { SiteLocale } from "@/shared/i18n/site-locale";
import englishMessages from "@/shared/i18n/ui-messages.en.json";

const catalog: Record<Exclude<SiteLocale, "ko">, Record<string, string>> = {
  en: englishMessages,
};

const englishOverrides: Record<string, string> = {
  "부산대학교": "Pusan National University",
  "부산대학교 학과 프로젝트": "PNU Department Projects",
  "부산대학교 학과 프로젝트 관리": "PNU Department Project Management",
  "프로젝트 찾기": "Find Projects",
  "프로젝트 현황": "Project overview",
  "지원 조건": "Application requirements",
  "프로젝트는": "Projects",
  "이어져야 합니다.": "should stay connected.",
  "알림": "Notifications",
  "관리": "Administration",
  "주제": "Topics",
  "지원서": "Applications",
  "교수 업무 흐름": "Faculty workspace",
  "관리자 업무": "Administration",
};

const parameterizedMessages = Object.entries(englishMessages)
  .filter(([source]) => /\{\d+\}/.test(source))
  .map(([source, translation]) => ({
    translation,
    pattern: new RegExp(
      `^${source
        .split(/(\{\d+\})/)
        .map((part) =>
          /^\{\d+\}$/.test(part)
            ? "(.*?)"
            : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("")}$`,
    ),
  }));

export function translateUiMessage(locale: SiteLocale, message: string): string {
  if (locale === "ko") return message;
  const override = englishOverrides[message];
  if (override) return override;
  const exact = catalog[locale][message];
  if (exact) return exact;
  for (const { pattern, translation } of parameterizedMessages) {
    const match = message.match(pattern);
    if (!match) continue;
    return translation.replace(/\{(\d+)\}/g, (_, index: string) => {
      return match[Number(index) + 1] ?? "";
    });
  }
  return message;
}
