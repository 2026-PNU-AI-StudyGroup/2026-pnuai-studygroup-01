"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { SiteLocale } from "@/modules/translation/domain/site-locale";
import { UiButton, UiSection } from "@/modules/translation/ui/localized-elements";

export function LanguagePopover({
  locale,
  updateLanguage,
  placement = "side",
  inverse = false,
}: {
  locale: SiteLocale;
  updateLanguage: (formData: FormData) => void | Promise<void>;
  placement?: "side" | "below";
  inverse?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const copy = locale === "ko"
    ? { trigger: "언어 선택", title: "언어", current: "현재 언어", korean: "한국어", english: "English" }
    : { trigger: "Choose language", title: "Language", current: "Current language", korean: "한국어", english: "English" };

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <UiButton
        ref={buttonRef}
        type="button"
        aria-label={copy.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={`snap-color grid size-11 place-items-center rounded-[var(--radius-control)] ${
          inverse
            ? open
              ? "bg-white/16 text-white"
              : "text-[#cbd6ff] hover:bg-white/10 hover:text-white"
            : open
              ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
        }`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75]">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5" />
        </svg>
      </UiButton>

      {open ? (
        <UiSection
          id={panelId}
          role="dialog"
          aria-label={copy.title}
          className={`absolute z-50 text-left text-[var(--ink)] ${
            placement === "side"
              ? "bottom-0 left-[calc(100%+0.75rem)] w-64"
              : "fixed left-4 right-4 top-[4.75rem] w-auto"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute z-10 size-3 rotate-45 bg-white ${
              placement === "side"
                ? "-left-1.5 bottom-4 border-b border-l border-[var(--line-strong)]"
                : "-top-1.5 right-[4.5rem] border-l border-t border-[var(--line-strong)] sm:right-[5.25rem]"
            }`}
          />
          <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white shadow-[0_12px_32px_rgb(23_32_51_/_0.14)]">
            <header className="border-b border-[var(--line)] px-5 py-4">
              <h2 className="text-base font-extrabold tracking-[-0.025em]">{copy.title}</h2>
              <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{copy.current}</p>
            </header>
            <div className="p-2">
              {(["ko", "en"] as const).map((value) => {
                const selected = locale === value;
                return (
                  <form key={value} action={updateLanguage}>
                    <input type="hidden" name="locale" value={value} />
                    <button
                      type="submit"
                      aria-pressed={selected}
                      className={`flex min-h-12 w-full items-center justify-between rounded-[var(--radius-control)] px-3 text-sm font-bold ${
                        selected
                          ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
                          : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
                      }`}
                    >
                      <span>{value === "ko" ? copy.korean : copy.english}</span>
                      {selected ? (
                        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-2">
                          <path d="m4 10 3.5 3.5L16 5.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        </UiSection>
      ) : null}
    </div>
  );
}
