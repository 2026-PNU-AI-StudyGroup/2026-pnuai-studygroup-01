"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type RefObject } from "react";

import { UiText } from "@/shared/i18n/i18n-provider";
import { UiButton } from "@/shared/i18n/localized-elements";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function ConfirmationDialog({
  open,
  title = "확인",
  description,
  confirmLabel = "확인",
  confirmClassName = "button-danger",
  cancelLabel = "취소",
  onConfirm,
  onCancel,
  returnFocusRef,
}: {
  open: boolean;
  title?: string;
  description: string;
  confirmLabel?: string;
  confirmClassName?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const timeoutId = window.setTimeout(() => cancelButtonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timeoutId);
      (returnFocusRef?.current ?? previouslyFocusedRef.current)?.focus({ preventScroll: true });
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[var(--ink)]/35 p-4" onMouseDown={onCancel}>
      <section
        ref={dialogRef}
        data-confirmation-dialog
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={trapFocus}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[var(--radius-panel)] bg-white p-6 shadow-[0_24px_70px_rgba(31,35,48,.18)]"
      >
        <h2 id={titleId} className="text-lg font-bold tracking-[-0.02em] text-[var(--ink)]"><UiText>{title}</UiText></h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p>
        <div className="mt-6 flex justify-end gap-2">
          <UiButton ref={cancelButtonRef} type="button" className="button-secondary" onClick={onCancel}>
            <UiText>{cancelLabel}</UiText>
          </UiButton>
          <UiButton type="button" className={confirmClassName} onClick={onConfirm}>
            <UiText>{confirmLabel}</UiText>
          </UiButton>
        </div>
      </section>
    </div>
  );
}
