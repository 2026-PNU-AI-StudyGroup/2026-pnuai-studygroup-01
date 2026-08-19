"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  type ArtifactMethod,
  ArtifactContentField,
  ArtifactMethodSelector,
  ArtifactRegistrationFields,
} from "@/app/projects/[projectId]/_components/artifact-registration-fields";
import { registerArtifactAction } from "@/app/projects/[projectId]/_actions/team-report-actions";
import {
  initialReportActionState,
  isUploadAbortError,
  teamFileUploadProgressLabel,
  type TeamFileUploadProgress,
  uploadFailureMessage,
  uploadTeamFile,
} from "@/app/projects/[projectId]/_lib/report-form-shared";

// 예전에는 화면 오른쪽 위 버튼으로 모달을 열어야 했다. 사진·영상은 화면 안에서 등록하는데
// 링크·파일만 따로 창을 띄우게 되어 있어 흐름이 끊겼다. 같은 화면에 나란히 둔다.
export function ArtifactRegistrationForm({ teamId }: { teamId: string }) {
  const titleId = useId();
  const [method, setMethod] = useState<ArtifactMethod>("LINK");
  const [state, setState] = useState(initialReportActionState);
  const [uploadProgress, setUploadProgress] = useState<TeamFileUploadProgress | null>(null);
  const [uploadCancelable, setUploadCancelable] = useState(false);
  const [pending, startTransition] = useTransition();
  const uploadControllerRef = useRef<AbortController | null>(null);
  const canCancelUpload = pending && uploadCancelable;

  useEffect(() => () => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
  }, []);

  return (
    <section aria-labelledby={titleId} className="space-y-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_10px_28px_rgba(31,35,48,0.045)] sm:p-6">
      <div>
        <h2 id={titleId} className="text-base font-extrabold tracking-[-0.02em]"><UiText>{"소스 코드·포스터·기타 자료"}</UiText></h2>
        <p className="muted mt-1 text-sm leading-6"><UiText>{"공개 링크 또는 파일 중 한 방식으로 결과물을 추가합니다."}</UiText></p>
      </div>
      <form
        className="grid gap-5"
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
                    message: error instanceof Error ? error.message : uploadFailureMessage,
                  });
            } finally {
              uploadControllerRef.current = null;
              setUploadCancelable(false);
              setUploadProgress(null);
            }
          });
        }}
      >
        <ArtifactRegistrationFields />
        <ArtifactMethodSelector
          method={method}
          pending={pending}
          onChange={(nextMethod) => {
            setMethod(nextMethod);
            setState(initialReportActionState);
          }}
        />
        <ArtifactContentField method={method} />
        {uploadProgress ? (
          <div role="status" aria-live="polite" className="grid gap-2 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3 text-sm font-semibold">
            <span><UiText>{teamFileUploadProgressLabel(uploadProgress)}</UiText></span>
            {uploadProgress.percent !== null ? <progress aria-label={teamFileUploadProgressLabel(uploadProgress)} className="h-2 w-full accent-[var(--primary)]" max={100} value={uploadProgress.percent} /> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" role={state.status === "error" ? "alert" : undefined} className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
            {state.message ? <UiText>{state.message}</UiText> : null}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canCancelUpload ? (
              <button type="button" className="button-secondary" onClick={() => uploadControllerRef.current?.abort()}>
                <UiText>{"업로드 취소"}</UiText>
              </button>
            ) : null}
            <button type="submit" className="button-primary" disabled={pending}>
              <UiText>{pending ? (uploadProgress ? teamFileUploadProgressLabel(uploadProgress) : "등록 중") : "결과물 등록"}</UiText>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
