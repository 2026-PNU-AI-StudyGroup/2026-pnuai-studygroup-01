"use client";

import { useState } from "react";

import { UiText } from "@/shared/i18n/i18n-provider";
import { UiButton, UiDiv } from "@/shared/i18n/localized-elements";
import { THEME_COOKIE, rememberAppearance, type SiteTheme } from "@/shared/ui/appearance";

const CHOICES: { value: SiteTheme; label: string }[] = [
  { value: "system", label: "시스템" },
  { value: "light", label: "밝게" },
  { value: "dark", label: "어둡게" },
];

/**
 * 밝기 고르는 자리.
 *
 * 세 칸을 다 펼쳐 둔다. 단추 하나를 눌러 돌려 가며 바꾸게 하면 지금 어디에 있는지 알 수 없다.
 * 고른 값은 html 의 data-theme 에 바로 적고, 기기 설정을 따르겠다는 뜻일 때는 속성을 아예
 * 지워서 css 의 color-scheme 이 판단하게 둔다.
 */
export function ThemeChoice({ initialTheme }: { initialTheme: SiteTheme }) {
  const [theme, setTheme] = useState(initialTheme);

  return (
    <div className="border-b border-[var(--line)] px-5 py-4">
      <p className="text-xs font-bold text-[var(--muted)]"><UiText>{"화면 테마"}</UiText></p>
      <UiDiv role="group" aria-label="화면 테마" className="mt-2 grid grid-cols-3 gap-1 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-1">
        {CHOICES.map(({ value, label }) => {
          const selected = theme === value;
          return (
            <UiButton
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                const root = document.documentElement;
                if (value === "system") delete root.dataset.theme;
                else root.dataset.theme = value;
                rememberAppearance(THEME_COOKIE, value);
                setTheme(value);
              }}
              className={`min-h-9 rounded-[calc(var(--radius-control)-0.15rem)] text-xs font-bold transition-colors ${
                selected
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-[var(--shadow-card)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              <UiText>{label}</UiText>
            </UiButton>
          );
        })}
      </UiDiv>
    </div>
  );
}
