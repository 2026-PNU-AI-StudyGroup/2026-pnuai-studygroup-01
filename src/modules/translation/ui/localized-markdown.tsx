"use client";

import { useState } from "react";

import { useI18n } from "@/shared/i18n/i18n-provider";
import { UiButton } from "@/shared/i18n/localized-elements";
import { renderMarkdown } from "@/shared/ui/render-markdown";

export function LocalizedMarkdown({ text, className = "" }: { text: string; className?: string }) {
  const { locale, t } = useI18n();
  const [showOriginal, setShowOriginal] = useState(false);
  const translation = t(text);
  const translated = translation !== text;
  const content = translated && !showOriginal ? translation : text;
  const label = locale === "ko"
    ? showOriginal ? "번역문 보기" : "원문 보기"
    : showOriginal ? "Show translation" : "Show original";

  return (
    <div className={`${className} relative ${translated ? "pr-10" : ""}`}>
      {translated ? (
        <UiButton
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={showOriginal}
          onClick={() => setShowOriginal((current) => !current)}
          className="snap-color absolute right-0 top-0 z-10 grid size-8 place-items-center rounded-[var(--radius-control)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.125rem] fill-none stroke-current stroke-[1.75]">
            <path d="M4 5h10M9 3v2M6 5c.7 3.2 2.7 5.8 6 7.5M12 5c-.8 3.2-2.8 5.8-6 7.5M14 19l3-8 3 8M15 16h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </UiButton>
      ) : null}
      {renderMarkdown(content)}
    </div>
  );
}
