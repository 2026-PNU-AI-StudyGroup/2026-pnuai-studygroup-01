"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  type ArtifactMethod,
  ArtifactMethodSelector,
  ArtifactRegistrationFields,
} from "@/app/teams/[teamId]/_components/artifact-registration-fields";
import { registerArtifactAction } from "@/app/teams/[teamId]/_actions/team-report-actions";
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
import { SuccessToast } from "@/shared/ui/success-toast";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";

export function ArtifactRegistrationForm({ teamId }: { teamId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [method, setMethod] = useState<ArtifactMethod>("LINK");
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
        className="button-primary"
        onClick={() => dialogRef.current?.showModal()}
        disabled={pending}
      >
        <UiText>{"결과물 등록"}</UiText></button>
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
          eyebrow="프로젝트 결과"
          title="결과물 등록"
          description="공개 링크 또는 파일 중 한 방식으로 결과물을 추가합니다."
          titleId={titleId}
          closeLabel="결과물 등록 닫기"
          pending={pending}
          allowPendingCancel={canCancelUpload}
          onClose={cancelOrClose}
        />
        <ArtifactMethodSelector
          method={method}
          pending={pending}
          onChange={(nextMethod) => {
            setMethod(nextMethod);
            setState(initialReportActionState);
          }}
        />
        <form
          className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const selectedFile = method === "FILE" ? data.get("file") : null;
            if (method === "FILE" && (!(selectedFile instanceof File) || selectedFile.size === 0)) return;
            setState(initialReportActionState);
            startTransition(async () => {
              try {
                data.set("teamId", teamId);
                if (method === "FILE") {
                  const file = selectedFile as File;
                  const uploadController = new AbortController();
                  uploadControllerRef.current = uploadController;
                  setUploadCancelable(true);
                  const uploadId = await uploadTeamFile(teamId, "ARTIFACT", file, {
                    signal: uploadController.signal,
                    onProgress: setUploadProgress,
                  });
                  uploadControllerRef.current = null;
                  setUploadCancelable(false);
                  setUploadProgress(null);
                  data.delete("file");
                  data.set("uploadId", uploadId);
                }
                const result = await registerArtifactAction(data);
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
                uploadControllerRef.current = null;
                setUploadCancelable(false);
                setUploadProgress(null);
              }
            });
          }}
        >
          <ArtifactRegistrationFields method={method} />
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
            pendingLabel={uploadProgress ? teamFileUploadProgressLabel(uploadProgress) : "결과물 등록 중"}
            submitLabel="결과물 등록"
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
