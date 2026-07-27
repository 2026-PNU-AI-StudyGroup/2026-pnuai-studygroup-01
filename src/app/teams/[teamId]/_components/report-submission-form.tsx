"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useId, useRef, useState, useTransition } from "react";

import {
  submitReportVersionAction,
} from "@/app/teams/[teamId]/_actions/team-report-actions";
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
import { ReportSubmissionFields } from "@/app/teams/[teamId]/_components/report-submission-fields";
import type { ReportType } from "@/modules/report/domain/report-policy";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";

type ReportSubmissionFormProps = {
  teamId: string;
  requirements: Array<{ type: ReportType; dueAt: Date }>;
};

export function ReportSubmissionForm({
  teamId,
  requirements,
}: ReportSubmissionFormProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, setState] = useState(initialReportActionState);
  const [pending, startTransition] = useTransition();
  const toastMessage = useDialogSuccessToast(state, dialogRef);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="button-primary"
      >
        <UiText>{"보고서 제출"}</UiText></button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className={`${reportDialogClassName} max-w-2xl`}
      >
        <ReportFormDialogHeader
          eyebrow="보고서 제출"
          title="새 버전 등록"
          description="설정된 기한 안에 PDF 또는 Word 파일을 제출합니다."
          titleId={titleId}
          closeLabel="보고서 제출 닫기"
          pending={pending}
          onClose={() => dialogRef.current?.close()}
        />
        <form
          className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const file = data.get("file");
            if (!(file instanceof File) || file.size === 0) return;
            startTransition(async () => {
              try {
                const uploadId = await uploadTeamFile(teamId, "REPORT", file);
                data.delete("file");
                data.set("teamId", teamId);
                data.set("uploadId", uploadId);
                const result = await submitReportVersionAction(data);
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
          <ReportSubmissionFields requirements={requirements} />
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
            pendingLabel="검증 및 제출 중"
            submitLabel="새 버전 제출"
            onCancel={() => dialogRef.current?.close()}
          />
        </form>
      </dialog>
      <ReportFormToast message={toastMessage} />
    </>
  );
}
