"use client";

import { UiButton } from "@/shared/i18n/localized-elements";
import { useState } from "react";

export function TranslatedTextClient({
  original,
  translation,
  locale,
  className = "",
}: {
  original: string;
  translation: string | null;
  locale: "ko" | "en";
  className?: string;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const translated = translation !== null && translation !== original;
  const content = translated && !showOriginal ? translation : original;
  const label = locale === "ko"
    ? showOriginal ? "번역문 보기" : "원문 보기"
    : showOriginal ? "Show translation" : "Show original";

  return (
    <div className={`${className} relative whitespace-pre-wrap ${translated ? "pr-10" : ""}`}>
      {translated ? (
        <UiButton
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={showOriginal}
          onClick={() => setShowOriginal((current) => !current)}
          className="snap-color absolute right-0 top-0 grid size-8 place-items-center rounded-[var(--radius-control)] text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
        >
          {showOriginal ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.125rem] fill-none stroke-current stroke-[1.75]">
              <path d="M4 5h10M9 3v2M6 5c.7 3.2 2.7 5.8 6 7.5M12 5c-.8 3.2-2.8 5.8-6 7.5M14 19l3-8 3 8M15 16h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.125rem] fill-none stroke-current stroke-[1.75]">
              <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </UiButton>
      ) : null}
      {content}
    </div>
  );
}
