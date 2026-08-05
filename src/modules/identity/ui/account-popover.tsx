"use client";

import Link from "next/link";
import { UiButton, UiSection } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useEffect, useId, useRef, useState } from "react";

import { useSignOut } from "@/modules/identity/ui/use-sign-out";
import type { SiteLocale } from "@/modules/translation/domain/site-locale";

export function AccountPopover({
  userName,
  roleLabel,
  active,
  accountPageCurrent,
  placement = "side",
  inverse = false,
  locale,
}: {
  userName: string;
  roleLabel: string;
  active: boolean;
  accountPageCurrent: boolean;
  placement?: "side" | "below";
  inverse?: boolean;
  locale: SiteLocale;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { signOut, isPending, message } = useSignOut();
  const showDesktopLabel = inverse && placement === "side";
  const copy = locale === "ko"
    ? { accountMenu: "계정 메뉴", myAccount: "내 계정", signingOut: "로그아웃 중…", signOut: "로그아웃" }
    : { accountMenu: "Account menu", myAccount: "My account", signingOut: "Signing out…", signOut: "Sign out" };

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
    <div ref={rootRef} className={`relative ${showDesktopLabel ? "w-full" : ""}`}>
      <UiButton
        ref={buttonRef}
        type="button"
        aria-current={active ? "page" : undefined}
        aria-label={`${userName} ${copy.accountMenu}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={`snap-color rounded-[var(--radius-control)] ${
          showDesktopLabel
            ? "flex min-h-[4rem] w-full flex-col items-center justify-center gap-0.5 text-[0.7rem] font-bold"
            : "grid size-11 place-items-center"
        } ${
          inverse
            ? open || active
              ? "bg-white/16 text-white"
              : "text-[#cbd6ff] hover:bg-white/10 hover:text-white"
            : open || active
              ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
        }`}
      >
        <span aria-hidden="true" className={`grid size-9 place-items-center rounded-full ${inverse ? "bg-white/12" : "bg-[#e8ebf2]"}`}>
          <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75]">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c.4-4.2 2.7-6.2 7-6.2s6.6 2 7 6.2" />
          </svg>
        </span>
        {showDesktopLabel ? <span aria-hidden="true"><UiText>{roleLabel}</UiText></span> : null}
      </UiButton>

      {open ? (
        <UiSection
          id={panelId}
          role="dialog"
          aria-label={copy.accountMenu}
          className={`absolute z-50 text-left text-[var(--ink)] ${
            placement === "side"
              ? "bottom-0 left-[calc(100%+0.75rem)] w-72"
              : "fixed left-4 right-4 top-[4.75rem] w-auto"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute z-10 size-3 rotate-45 bg-white ${
              placement === "side"
                ? "-left-1.5 bottom-4 border-b border-l border-[var(--line-strong)]"
                : "-top-1.5 right-5 border-l border-t border-[var(--line-strong)] sm:right-8"
            }`}
          />
          <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white shadow-[0_12px_32px_rgb(23_32_51_/_0.14)]">
            <header className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-[var(--muted)]">
                <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75]">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c.4-4.2 2.7-6.2 7-6.2s6.6 2 7 6.2" />
                </svg>
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-bold">{userName}</strong>
                <span className="mt-0.5 block text-xs font-semibold text-[var(--muted)]"><UiText>{roleLabel}</UiText></span>
              </span>
            </header>

            {accountPageCurrent ? (
              <span
                aria-current="page"
                className="flex min-h-12 items-center justify-between border-b border-[var(--line)] bg-[var(--primary-subtle)] px-5 text-sm font-bold text-[var(--primary)]"
              >
                {copy.myAccount}
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-2">
                  <path d="m4 10 3.5 3.5L16 5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            ) : (
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center justify-between border-b border-[var(--line)] px-5 text-sm font-bold hover:bg-[var(--surface-subtle)] hover:text-[var(--primary)]"
              >
                {copy.myAccount}
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 fill-none stroke-current stroke-[1.75]">
                  <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            )}
            <button
              type="button"
              onClick={signOut}
              disabled={isPending}
              className="flex min-h-12 w-full items-center px-5 text-left text-sm font-semibold text-[var(--muted)] hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)] disabled:cursor-wait disabled:opacity-60"
            >
              {isPending ? copy.signingOut : copy.signOut}
            </button>
            {message ? (
              <p role="status" aria-live="polite" className="border-t border-[var(--line)] px-5 py-3 text-xs font-semibold text-[var(--danger)]">
                <UiText>{message}</UiText>
              </p>
            ) : null}
          </div>
        </UiSection>
      ) : null}
    </div>
  );
}
