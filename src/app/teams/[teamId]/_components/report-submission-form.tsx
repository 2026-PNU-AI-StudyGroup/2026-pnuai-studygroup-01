"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  submitReportVersionAction,
} from "@/app/teams/[teamId]/_actions/team-report-actions";
import {
  reportDialogClassName,
  ReportFormActions,
  ReportFormDialogHeader,
} from "@/app/teams/[teamId]/_components/report-form-layout";
import {
  initialReportActionState,
  isUploadAbortError,
  teamFileUploadProgressLabel,
  type TeamFileUploadProgress,
  uploadFailureMessage,
  uploadTeamFile,
} from "@/app/teams/[teamId]/_lib/report-form-shared";
import { ReportSubmissionFields } from "@/app/teams/[teamId]/_components/report-submission-fields";
import type { ReportType } from "@/modules/report/domain/report-policy";
import { SuccessToast } from "@/shared/ui/success-toast";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";

type ReportSubmissionFormProps = {
  teamId: string;
  requirements: Array<{ type: ReportType; dueAt: Date }>;
  triggerLabel?: string;
  triggerClassName?: string;
};

export function ReportSubmissionForm({
  teamId,
  requirements,
  triggerLabel = "보고서 제출",
  triggerClassName = "button-primary",
}: ReportSubmissionFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, setState] = useState(initialReportActionState);
  const [uploadProgress, setUploadProgress] = useState<TeamFileUploadProgress | null>(null);
  const [uploadCancelable, setUploadCancelable] = useState(false);
  const [pending, startTransition] = useTransition();
  const uploadControllerRef = useRef<AbortController | null>(null);
  const toastMessage = useDialogSuccessToast(state, dialogRef);
  const canCancelUpload = pending && uploadCancelable;

  useEffect(() => () => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
  }, []);

  function cancelOrClose() {
    uploadControllerRef.current?.abort();
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName}
        disabled={pending}
      >
        <UiText>{triggerLabel}</UiText></button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          if (!pending) return;
          event.preventDefault();
          if (canCancelUpload) cancelOrClose();
        }}
        className={`${reportDialogClassName} max-w-2xl`}
      >
        <ReportFormDialogHeader
          title="새 버전 제출"
          description="설정된 기한 안에 PDF 또는 Word 파일을 제출합니다."
          titleId={titleId}
          closeLabel="보고서 제출 닫기"
          pending={pending}
          allowPendingCancel={canCancelUpload}
          onClose={cancelOrClose}
        />
        <form
          className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const file = data.get("file");
            if (!(file instanceof File) || file.size === 0) return;
            setState(initialReportActionState);
            const uploadController = new AbortController();
            uploadControllerRef.current = uploadController;
            setUploadCancelable(true);
            startTransition(async () => {
              try {
                const uploadId = await uploadTeamFile(teamId, "REPORT", file, {
                  signal: uploadController.signal,
                  onProgress: setUploadProgress,
                });
                uploadControllerRef.current = null;
                setUploadCancelable(false);
                setUploadProgress(null);
                data.delete("file");
                data.set("teamId", teamId);
                data.set("uploadId", uploadId);
                const result = await submitReportVersionAction(data);
                setState(result);
                if (result.status === "success") form.reset();
              } catch (error) {
                setState(isUploadAbortError(error)
                  ? initialReportActionState
                  : {
                      status: "error",
                      message:
                        error instanceof Error
                          ? error.message
                          : uploadFailureMessage,
                    });
              } finally {
                if (uploadControllerRef.current === uploadController) {
                  uploadControllerRef.current = null;
                }
                setUploadCancelable(false);
                setUploadProgress(null);
              }
            });
          }}
        >
          <ReportSubmissionFields requirements={requirements} />
          {uploadProgress ? (
            <div role="status" aria-live="polite" className="grid gap-2 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3 text-sm font-semibold sm:col-span-2">
              <span><UiText>{teamFileUploadProgressLabel(uploadProgress)}</UiText></span>
              {uploadProgress.percent !== null ? <progress aria-label={teamFileUploadProgressLabel(uploadProgress)} className="h-2 w-full accent-[var(--primary)]" max={100} value={uploadProgress.percent} /> : null}
            </div>
          ) : null}
          {state.status === "error" ? (
            <p
              role="alert"
              className="text-sm font-semibold text-[var(--danger)] sm:col-span-2"
            >
              <UiText>{state.message}</UiText>
            </p>
          ) : null}
          <ReportFormActions
            pending={pending}
            pendingLabel={uploadProgress ? teamFileUploadProgressLabel(uploadProgress) : "보고서 등록 중"}
            submitLabel="새 버전 제출"
            allowPendingCancel={canCancelUpload}
            pendingCancelLabel="업로드 취소"
            onCancel={cancelOrClose}
          />
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}
