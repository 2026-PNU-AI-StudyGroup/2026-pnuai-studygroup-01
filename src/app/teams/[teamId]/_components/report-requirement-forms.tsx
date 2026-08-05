"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import { removeReportRequirementAction, setReportRequirementAction } from "@/app/teams/[teamId]/_actions/team-report-actions";
import { reportDialogClassName, ReportFormActions, ReportFormDialogHeader } from "@/app/teams/[teamId]/_components/report-form-layout";
import { initialReportActionState, koreanDateTimeInput, reportTypeLabel } from "@/app/teams/[teamId]/_lib/report-form-shared";
import type { ReportType } from "@/modules/report/domain/report-policy";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { SuccessToast } from "@/shared/ui/success-toast";
import { SUCCESS_TOAST_DURATION_MS, useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";
import { CustomSelect } from "@/shared/ui/custom-select";

export function ReportRequirementForm({ teamId, executionStartsAt, submissionEndsAt }: {
  teamId: string;
  executionStartsAt: Date;
  submissionEndsAt: Date;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(setReportRequirementAction, initialReportActionState);
  const toastMessage = useDialogSuccessToast(state, dialogRef);
  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="button-primary"><UiText>{"보고서 일정 설정"}</UiText></button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className={`${reportDialogClassName} max-w-xl`}>
        <ReportFormDialogHeader eyebrow="보고서 일정" title="보고서와 마감 설정" description="제출할 보고서 종류와 마감 시각을 정합니다." titleId={titleId} closeLabel="보고서 설정 닫기" pending={pending} onClose={() => dialogRef.current?.close()} />
        <form action={action} className="grid gap-5 px-5 py-6 sm:px-7">
          <input type="hidden" name="teamId" value={teamId} />
          <label className="grid gap-2 text-sm font-semibold">
            <UiText>{"제출 보고서"}</UiText><CustomSelect name="type" ariaLabel="제출 보고서" defaultValue="START" options={[
              { value: "START", label: "착수 보고서" },
              { value: "MIDTERM", label: "중간 보고서" },
              { value: "FINAL", label: "결과 보고서" },
            ]} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            <UiText>{"제출 기한"}</UiText><input name="dueAt" type="datetime-local" required min={koreanDateTimeInput(executionStartsAt)} max={koreanDateTimeInput(submissionEndsAt)} className="field" />
          </label>
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
          <ReportFormActions pending={pending} pendingLabel="저장 중" submitLabel="일정 저장" onCancel={() => dialogRef.current?.close()} />
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}

export function RemoveReportRequirementForm({ teamId, type, disabled }: { teamId: string; type: ReportType; disabled: boolean }) {
  if (disabled) {
    return <p className="max-w-sm text-xs font-semibold text-[var(--muted)]"><UiText>{"제출 이력이 있어 일정이 고정되었습니다."}</UiText></p>;
  }
  return <ActiveRemoveReportRequirementForm teamId={teamId} type={type} />;
}

function ActiveRemoveReportRequirementForm({ teamId, type }: { teamId: string; type: ReportType }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(removeReportRequirementAction, initialReportActionState);
  useEffect(() => {
    if (state.status === "conflict") {
      router.refresh();
      return;
    }
    if (state.status !== "success") return;
    const timer = window.setTimeout(() => router.refresh(), SUCCESS_TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [router, state]);
  return (
    <form action={action}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="type" value={type} />
      <ConfirmSubmitButton disabled={pending} className="button-quiet text-[var(--danger)]" confirmMessage={`${reportTypeLabel[type]} 일정을 삭제하시겠습니까?`}>
        <UiText>{pending ? "삭제 중" : "일정 삭제"}</UiText>
      </ConfirmSubmitButton>
      {state.status === "error" ? <p role="alert" className="mt-2 max-w-sm text-xs font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
      {state.status === "conflict" ? <p role="status" className="mt-2 max-w-sm text-xs font-semibold text-[var(--muted)]"><UiText>{state.message}</UiText></p> : null}
      <SuccessToast message={state.status === "success" ? state.message : ""} />
    </form>
  );
}
