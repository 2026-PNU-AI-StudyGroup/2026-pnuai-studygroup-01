"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import {
  addReportFeedbackAction,
  scoreReportAction,
} from "@/app/teams/[teamId]/_actions/team-report-actions";
import {
  reportDialogClassName,
  ReportFormActions,
  ReportFormDialogHeader,
} from "@/app/teams/[teamId]/_components/report-form-layout";
import { initialReportActionState } from "@/app/teams/[teamId]/_lib/report-form-shared";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { TextInput } from "@/shared/ui/form-system";
import { SuccessToast } from "@/shared/ui/success-toast";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";

function FormMessage({ status, message }: { status: "idle" | "error" | "success" | "conflict"; message: string }) {
  if (!message || status === "success") return null;
  return <p role={status === "error" || status === "conflict" ? "alert" : "status"} className="text-sm font-semibold text-[var(--danger)]"><UiText>{message}</UiText></p>;
}

export function ReportScoreForm({
  teamId,
  reportId,
  currentScore,
  currentComment,
}: {
  teamId: string;
  reportId: string;
  currentScore?: number;
  currentComment?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(scoreReportAction, initialReportActionState);
  const toastMessage = useDialogSuccessToast(state, dialogRef);
  const triggerLabel = currentScore === undefined ? "점수 입력" : "점수 수정";

  return (
    <>
      <button type="button" className="button-secondary mt-3" onClick={() => dialogRef.current?.showModal()}><UiText>{triggerLabel}</UiText></button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className={`${reportDialogClassName} max-w-xl`}>
        <ReportFormDialogHeader title={triggerLabel} description="점수와 총평을 확인한 뒤 한 번에 저장합니다." titleId={titleId} closeLabel="점수 입력 닫기" pending={pending} onClose={() => dialogRef.current?.close()} />
        <form action={action} className="grid gap-5 px-5 py-6 sm:px-7">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="reportId" value={reportId} />
          <label className="grid gap-1.5 text-sm font-semibold">
            <span><UiText>{"점수"}</UiText> <span className="font-normal text-[var(--muted)]">(0–100)</span></span>
            <TextInput name="score" type="number" min={0} max={100} required defaultValue={currentScore ?? ""} disabled={pending} className="w-32" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            <UiText>{"총평"}</UiText>
            <UiTextarea name="comment" maxLength={2000} rows={4} defaultValue={currentComment ?? ""} disabled={pending} placeholder="총평(선택)을 남겨 주세요." className="form-control resize-y" />
          </label>
          <FormMessage status={state.status} message={state.message} />
          <ReportFormActions pending={pending} pendingLabel="저장 중" submitLabel="점수 저장" onCancel={() => dialogRef.current?.close()} />
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}

export function ReportFeedbackForm({ teamId, reportId }: { teamId: string; reportId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(addReportFeedbackAction, initialReportActionState);
  const toastMessage = useDialogSuccessToast(state, dialogRef);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <>
      <button type="button" className="button-secondary mt-3" onClick={() => dialogRef.current?.showModal()}><UiText>{"피드백 남기기"}</UiText></button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className={`${reportDialogClassName} max-w-xl`}>
        <ReportFormDialogHeader title="피드백 남기기" description="등록한 피드백은 보고서 참여자에게 표시됩니다." titleId={titleId} closeLabel="피드백 입력 닫기" pending={pending} onClose={() => dialogRef.current?.close()} />
        <form ref={formRef} action={action} className="grid gap-5 px-5 py-6 sm:px-7">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="reportId" value={reportId} />
          <label className="grid gap-1.5 text-sm font-semibold">
            <UiText>{"피드백"}</UiText>
            <UiTextarea name="body" maxLength={2000} rows={5} required disabled={pending} placeholder="이 보고서에 대한 피드백을 남겨 주세요." className="form-control resize-y" />
          </label>
          <FormMessage status={state.status} message={state.message} />
          <ReportFormActions pending={pending} pendingLabel="등록 중" submitLabel="피드백 등록" onCancel={() => dialogRef.current?.close()} />
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}
