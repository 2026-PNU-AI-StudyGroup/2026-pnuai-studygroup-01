"use client";

import type { ReactNode } from "react";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CloseIcon } from "@/app/projects/[projectId]/_components/workspace-icons";

export const reportDialogClassName = "fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-[var(--surface)] p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[var(--backdrop)]";

export function ReportFormDialogHeader({ eyebrow, title, description, titleId, closeLabel, pending, allowPendingCancel = false, onClose }: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  titleId: string;
  closeLabel: string;
  pending: boolean;
  allowPendingCancel?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7">
      <div>
        {eyebrow ? <p className="eyebrow"><UiText>{eyebrow}</UiText></p> : null}
        <h3 id={titleId} className={`${eyebrow ? "mt-2" : ""} text-2xl font-bold tracking-[-0.035em]`}><UiText>{title}</UiText></h3>
        {description ? <p className="muted mt-2 text-sm"><UiText>{description}</UiText></p> : null}
      </div>
      <button type="button" onClick={onClose} disabled={pending && !allowPendingCancel} aria-label={closeLabel} className="button-quiet min-w-11 shrink-0 px-0"><CloseIcon /></button>
    </div>
  );
}

export function ReportFormActions({ pending, pendingLabel, submitLabel, allowPendingCancel = false, pendingCancelLabel = "작업 취소", onCancel }: {
  pending: boolean;
  pendingLabel: string;
  submitLabel: string;
  allowPendingCancel?: boolean;
  pendingCancelLabel?: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} disabled={pending && !allowPendingCancel} className="button-quiet"><UiText>{pending && allowPendingCancel ? pendingCancelLabel : "취소"}</UiText></button>
      <button disabled={pending} className="button-primary">{pending ? pendingLabel : submitLabel}</button>
    </div>
  );
}
