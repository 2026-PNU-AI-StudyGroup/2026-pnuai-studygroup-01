"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiButton } from "@/modules/translation/ui/localized-elements";
import { ConfirmationDialog } from "@/shared/ui/confirmation-dialog";
import { useRouter } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function formSnapshot(form: HTMLFormElement): string {
  return JSON.stringify(Array.from(new FormData(form).entries()).map(([name, value]) => [
    name,
    value instanceof File
      ? { name: value.name, size: value.size, type: value.type, lastModified: value.lastModified }
      : value,
  ]));
}

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
  size?: "default" | "wide" | "wizard";
}) {
  const router = useRouter();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const initialFormSnapshotsRef = useRef(new Map<HTMLFormElement, string>());
  const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);

  const hasUnsavedChanges = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return false;
    return Array.from(dialog.querySelectorAll("form")).some((form) => {
      const initial = initialFormSnapshotsRef.current.get(form);
      return initial !== undefined && initial !== formSnapshot(form);
    });
  }, []);

  const requestClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      setDiscardConfirmationOpen(true);
      return;
    }
    router.replace(closeHref);
  }, [closeHref, hasUnsavedChanges, router]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    initialFormSnapshotsRef.current = new Map(
      Array.from(dialog?.querySelectorAll("form") ?? []).map((form) => [form, formSnapshot(form)]),
    );
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      requestClose();
    };
    const keepFocusInside = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !dialog || dialog.contains(target)) return;
      if (target instanceof Element && (target.closest("[role='listbox']") || target.closest(".date-time-input__calendar"))) return;
      closeButtonRef.current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("focusin", keepFocusInside);
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [requestClose]);

  function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest("[data-confirmation-dialog]")) return;
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.getAttribute("aria-hidden") !== "true");
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={`fixed inset-0 z-[65] grid place-items-center overflow-y-auto bg-[var(--ink)]/35 ${size === "wizard" ? "p-0 sm:p-6" : "p-4 sm:p-6"}`}>
      <UiButton type="button" tabIndex={-1} aria-label="모달 닫기" className="absolute inset-0 cursor-default" onClick={requestClose} />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        tabIndex={-1}
        onKeyDown={trapFocus}
        className={`relative my-auto w-full overflow-y-auto bg-white shadow-[0_24px_70px_rgba(31,35,48,.18)] ${size === "wizard" ? "min-h-dvh max-w-5xl rounded-none p-4 sm:min-h-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[var(--radius-panel)] sm:p-8" : `rounded-[var(--radius-panel)] p-6 sm:p-8 ${size === "wide" ? "max-w-4xl" : "max-w-xl"}`}`}
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
            onClick={requestClose}
          >
            ×
          </UiButton>
        </div>
        <div className="mt-6"><UiText>{children}</UiText></div>
      </section>
      <ConfirmationDialog
        open={discardConfirmationOpen}
        title="작성 중인 내용 삭제"
        description="작성 중인 내용이 있습니다. 닫으면 입력한 내용이 사라집니다. 계속하시겠습니까?"
        confirmLabel="계속"
        onConfirm={() => router.replace(closeHref)}
        onCancel={() => setDiscardConfirmationOpen(false)}
        returnFocusRef={closeButtonRef}
      />
    </div>
  );
}
