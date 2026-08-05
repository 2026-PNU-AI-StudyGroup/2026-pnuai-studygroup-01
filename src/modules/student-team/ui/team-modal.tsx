"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiButton } from "@/modules/translation/ui/localized-elements";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export function TeamModal({
  title,
  description,
  children,
  closeHref = "/teams",
  size = "default",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  closeHref?: string;
  size?: "default" | "wide";
}) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.replace(closeHref);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeHref, router]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-[var(--ink)]/35 p-4 sm:p-6">
      <UiButton type="button" aria-label="모달 닫기" className="absolute inset-0 cursor-default" onClick={() => router.replace(closeHref)} />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        className={`relative my-auto w-full rounded-[var(--radius-panel)] bg-white p-6 shadow-[0_24px_70px_rgba(31,35,48,.18)] sm:p-8 ${size === "wide" ? "max-w-4xl" : "max-w-xl"}`}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 id="team-modal-title" className="text-2xl font-bold tracking-[-0.035em] text-[var(--ink)]"><UiText>{title}</UiText></h2>
            {description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p> : null}
          </div>
          <UiButton
            ref={closeButtonRef}
            type="button"
            aria-label="닫기"
            className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-xl text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"
            onClick={() => router.replace(closeHref)}
          >
            ×
          </UiButton>
        </div>
        <div className="mt-6"><UiText>{children}</UiText></div>
      </section>
    </div>
  );
}
