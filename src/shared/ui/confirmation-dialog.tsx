"use client";

import { useEffect, useId, useRef, type RefObject } from "react";

import { UiText } from "@/shared/i18n/i18n-provider";
import { UiButton } from "@/shared/i18n/localized-elements";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const dialog = dialogRef.current;
    const returnFocusElement = returnFocusRef?.current ?? previouslyFocusedRef.current;
    if (!dialog?.open) dialog?.showModal();
    const timeoutId = window.setTimeout(() => cancelButtonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timeoutId);
      if (dialog?.open) dialog.close();
      returnFocusElement?.focus({ preventScroll: true });
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      data-confirmation-dialog
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-6 text-[var(--ink)] shadow-[0_24px_70px_rgba(31,35,48,.18)] backdrop:bg-[rgba(23,32,51,.48)]"
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
    </dialog>
  );
}
