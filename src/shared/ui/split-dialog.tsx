"use client";

import { useEffect, useId, type ReactNode, type RefObject } from "react";

import { UiButton } from "@/shared/i18n/localized-elements";
import { UiText } from "@/shared/i18n/i18n-provider";

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 fill-none stroke-current stroke-[1.75]">
      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

export function SplitDialog({ dialogRef, closeButtonRef, openOnMount = false, eyebrow, title, context, description, steps, children, closeLabel, pending = false, onRequestClose }: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
  openOnMount?: boolean;
  eyebrow?: string;
  title: string;
  context?: string;
  description?: string;
  steps?: ReactNode;
  children: ReactNode;
  closeLabel: string;
  pending?: boolean;
  onRequestClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const hasDescription = Boolean(context || description);

  useEffect(() => {
    if (openOnMount && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [dialogRef, openOnMount]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={hasDescription ? descriptionId : undefined}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        if (!pending) onRequestClose();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)] lg:overflow-hidden"
    >
      <div className="grid lg:max-h-[calc(100dvh-2rem)] lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <header className="border-b border-[var(--line)] bg-[var(--primary-subtle)] px-6 py-7 lg:grid lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)] lg:border-b-0 lg:border-r lg:px-8 lg:py-9">
          <div>
            {eyebrow ? <p className="text-xs font-bold text-[var(--primary)]"><UiText>{eyebrow}</UiText></p> : null}
            <h2 id={titleId} className={`${eyebrow ? "mt-3" : ""} text-3xl font-bold leading-[1.08] tracking-[-0.045em]`}><UiText>{title}</UiText></h2>
          </div>
          {hasDescription || steps ? (
            <div id={hasDescription ? descriptionId : undefined} className="lg:min-h-0 lg:overflow-y-auto">
              {context ? <p className="mt-5 font-semibold leading-6 [overflow-wrap:anywhere]"><UiText>{context}</UiText></p> : null}
              {description ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p> : null}
              {steps}
            </div>
          ) : null}
        </header>
        <div className="min-h-0 lg:overflow-y-auto">{children}</div>
      </div>
      <UiButton ref={closeButtonRef} type="button" onClick={onRequestClose} disabled={pending} aria-label={closeLabel} className="button-quiet absolute right-4 top-4 min-w-11 px-0">
        <CloseIcon />
      </UiButton>
    </dialog>
  );
}
