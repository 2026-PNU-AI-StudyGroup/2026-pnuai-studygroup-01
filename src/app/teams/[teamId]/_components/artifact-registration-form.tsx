"use client";

import { useId, useRef, useState, useTransition } from "react";

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
  ReportFormToast,
} from "@/app/teams/[teamId]/_components/report-form-layout";
import {
  initialReportActionState,
  uploadFailureMessage,
  uploadTeamFile,
} from "@/app/teams/[teamId]/_lib/report-form-shared";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";

export function ArtifactRegistrationForm({ teamId }: { teamId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [method, setMethod] = useState<ArtifactMethod>("LINK");
  const [state, setState] = useState(initialReportActionState);
  const [pending, startTransition] = useTransition();
  const toastMessage = useDialogSuccessToast(state, dialogRef);

  return (
    <>
      <button
        type="button"
        className="button-primary"
        onClick={() => dialogRef.current?.showModal()}
      >
        결과물 등록
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
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
          onClose={() => dialogRef.current?.close()}
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
            startTransition(async () => {
              try {
                data.set("teamId", teamId);
                if (method === "FILE") {
                  const file = data.get("file");
                  if (!(file instanceof File) || file.size === 0) return;
                  const uploadId = await uploadTeamFile(teamId, "ARTIFACT", file);
                  data.delete("file");
                  data.set("uploadId", uploadId);
                }
                const result = await registerArtifactAction(data);
                setState(result);
                if (result.status === "success") form.reset();
              } catch (error) {
                setState({
                  status: "error",
                  message:
                    error instanceof Error
                      ? error.message
                      : uploadFailureMessage,
                });
              }
            });
          }}
        >
          <ArtifactRegistrationFields method={method} />
          {state.status === "error" ? (
            <p
              role="alert"
              className="text-sm font-semibold text-[var(--danger)] sm:col-span-2"
            >
              {state.message}
            </p>
          ) : null}
          <ReportFormActions
            pending={pending}
            pendingLabel="검증 및 등록 중"
            submitLabel="결과물 등록"
            onCancel={() => dialogRef.current?.close()}
          />
        </form>
      </dialog>
      <ReportFormToast message={toastMessage} />
    </>
  );
}
