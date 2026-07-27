"use client";

import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState, useId, useRef, useState } from "react";

import { decideReportAction } from "@/app/teams/[teamId]/_actions/team-report-actions";
import {
  reportDialogClassName,
  ReportFormDialogHeader,
} from "@/app/teams/[teamId]/_components/report-form-layout";
import { initialReportActionState } from "@/app/teams/[teamId]/_lib/report-form-shared";

const MAX_COMMENT_LENGTH = 2_000;
type PendingDecision = "APPROVED" | "REVISION_REQUESTED";

export function ReportDecisionForm({
  teamId,
  reportVersionId,
}: {
  teamId: string;
  reportVersionId: string;
}) {
  const [state, action, pending] = useActionState(
    decideReportAction,
    initialReportActionState,
  );
  const [comment, setComment] = useState("");
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();

  function openConfirmation(decision: PendingDecision) {
    setPendingDecision(decision);
    dialogRef.current?.showModal();
  }

  function closeConfirmation() {
    dialogRef.current?.close();
    setPendingDecision(null);
  }

  return (
    <section
      aria-labelledby={`report-review-title-${reportVersionId}`}
      className="mt-4 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-subtle)] p-4 sm:p-5"
    >
      <div>
        <h3
          id={`report-review-title-${reportVersionId}`}
          className="text-sm font-extrabold text-[var(--ink)]"
        >
          <UiText>{"보고서 검토"}</UiText>
        </h3>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          <UiText>{"검토 의견은 학생 화면에 그대로 표시됩니다. 수정 요청에는 의견이 필요합니다."}</UiText>
        </p>
      </div>
      <form action={action} className="mt-4 grid gap-4">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="reportVersionId" value={reportVersionId} />
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <label
              htmlFor={`report-comment-${reportVersionId}`}
              className="font-semibold"
            >
              <UiText>{"학생에게 전달할 검토 의견"}</UiText>
            </label>
            <span className="shrink-0 text-xs font-normal tabular-nums text-[var(--muted)]">
              {comment.length} / {MAX_COMMENT_LENGTH}<UiText>{"자"}</UiText>
            </span>
          </div>
          <UiTextarea
            id={`report-comment-${reportVersionId}`}
            name="comment"
            maxLength={MAX_COMMENT_LENGTH}
            rows={4}
            disabled={pending}
            value={comment}
            onChange={(event) => setComment(event.currentTarget.value)}
            placeholder="잘된 점과 보완할 내용을 구체적으로 남겨 주세요."
            className="field min-h-28 resize-y"
          />
        </div>
        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`text-sm font-semibold ${
              state.status === "error"
                ? "text-[var(--danger)]"
                : "text-[var(--success)]"
            }`}
          >
            <UiText>{state.message}</UiText>
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending || comment.trim().length === 0}
            className="button-secondary"
            onClick={() => openConfirmation("REVISION_REQUESTED")}
          >
            <UiText>{pending ? "저장 중" : "수정 요청하기"}</UiText>
          </button>
          <button
            type="button"
            disabled={pending}
            className="button-primary"
            onClick={() => openConfirmation("APPROVED")}
          >
            <UiText>{pending ? "저장 중" : "승인하기"}</UiText>
          </button>
        </div>
        <dialog
          ref={dialogRef}
          aria-labelledby={dialogTitleId}
          onCancel={(event) => {
            if (pending) event.preventDefault();
          }}
          className={`${reportDialogClassName} max-w-lg`}
        >
          <ReportFormDialogHeader
            eyebrow="최종 확인"
            title={pendingDecision === "REVISION_REQUESTED" ? "수정 요청 확인" : "보고서 승인 확인"}
            description="검토 결과는 저장 후 변경할 수 없습니다."
            titleId={dialogTitleId}
            closeLabel="검토 확인 닫기"
            pending={pending}
            onClose={closeConfirmation}
          />
          <div className="grid gap-5 px-5 py-6 sm:px-7">
            <div className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-4">
              <p className="text-xs font-bold text-[var(--muted)]"><UiText>{"학생에게 전달되는 검토 의견"}</UiText></p>
              <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">
                <UiText>{comment.trim() || "등록된 검토 의견이 없습니다."}</UiText>
              </p>
            </div>
            {state.status === "error" ? (
              <p role="alert" className="text-sm font-semibold text-[var(--danger)]">
                <UiText>{state.message}</UiText>
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
              <button type="button" disabled={pending} className="button-quiet" onClick={closeConfirmation}>
                <UiText>{"돌아가서 수정"}</UiText>
              </button>
              <button
                type="submit"
                name="decision"
                value={pendingDecision ?? ""}
                disabled={pending || pendingDecision === null}
                className={pendingDecision === "REVISION_REQUESTED" ? "button-secondary" : "button-primary"}
              >
                <UiText>{pending
                  ? "저장 중"
                  : pendingDecision === "REVISION_REQUESTED"
                    ? "수정 요청 보내기"
                    : "승인 확정"}</UiText>
              </button>
            </div>
          </div>
        </dialog>
      </form>
    </section>
  );
}
