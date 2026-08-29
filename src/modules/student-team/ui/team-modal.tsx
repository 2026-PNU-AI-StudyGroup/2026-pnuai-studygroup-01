"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiButton } from "@/modules/translation/ui/localized-elements";
import { ConfirmationDialog } from "@/shared/ui/confirmation-dialog";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
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
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    initialFormSnapshotsRef.current = new Map(
      Array.from(dialog.querySelectorAll("form")).map((form) => [form, formSnapshot(form)]),
    );
    closeButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby="team-modal-title"
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
        className={`fixed inset-0 m-auto w-[calc(100%-2rem)] overflow-y-auto border border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink)] shadow-[0_24px_70px_rgba(31,35,48,.18)] [overscroll-behavior:contain] backdrop:bg-[var(--backdrop)] ${size === "wizard" ? "max-h-[calc(100dvh-2rem)] max-w-5xl rounded-[var(--radius-panel)] p-4 sm:p-8" : `max-h-[calc(100dvh-2rem)] rounded-[var(--radius-panel)] p-6 sm:p-8 ${size === "wide" ? "max-w-4xl" : "max-w-xl"}`}`}
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
      </dialog>
      <ConfirmationDialog
        open={discardConfirmationOpen}
        title="작성 중인 내용 삭제"
        description="작성 중인 내용이 있습니다. 닫으면 입력한 내용이 사라집니다. 계속하시겠습니까?"
        confirmLabel="계속"
        onConfirm={() => router.replace(closeHref)}
        onCancel={() => setDiscardConfirmationOpen(false)}
        returnFocusRef={closeButtonRef}
      />
    </>
  );
}
