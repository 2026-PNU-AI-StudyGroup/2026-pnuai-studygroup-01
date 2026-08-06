"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  cancelProjectGuidanceRequestAction,
  createProjectGuidanceRequestAction,
  respondProjectGuidanceRequestAction,
} from "@/app/teams/[teamId]/_actions/project-guidance-request-actions";
import { CloseIcon } from "@/app/teams/[teamId]/_components/workspace-icons";
import { koreanDateTimeInput } from "@/app/teams/[teamId]/_lib/report-form-shared";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { ChoiceCard, DateTimeInput } from "@/shared/ui/form-system";
import { SuccessToast } from "@/shared/ui/success-toast";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";

type ProjectGuidanceActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

type ProjectGuidanceRequestKind = "MEETING" | "REVIEW";

const initialState: ProjectGuidanceActionState = { status: "idle", message: "" };

function ActionFeedback({ state }: { state: ProjectGuidanceActionState }) {
  if (!state.message) return null;

  const error = state.status === "error";
  return (
    <p
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
      className={`text-sm font-semibold ${error ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
    >
      <UiText>{state.message}</UiText>
    </p>
  );
}

const guidanceDialogClassName = "fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]";

function GuidanceDialogHeader({
  title,
  description,
  titleId,
  descriptionId,
  closeLabel,
  pending,
  onClose,
}: {
  title: string;
  description: string;
  titleId: string;
  descriptionId: string;
  closeLabel: string;
  pending: boolean;
  onClose: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-[var(--line)] bg-white px-5 py-5 sm:px-7">
      <div>
        <h3 id={titleId} className="text-2xl font-extrabold tracking-[-0.035em]"><UiText>{title}</UiText></h3>
        <p id={descriptionId} className="muted mt-2 text-sm leading-6"><UiText>{description}</UiText></p>
      </div>
      <button type="button" onClick={onClose} disabled={pending} aria-label={closeLabel} className="button-quiet min-w-11 shrink-0 px-0">
        <CloseIcon />
      </button>
    </header>
  );
}

export function ProjectGuidanceRequestForm({
  teamId,
  executionEndsAt,
}: {
  teamId: string;
  executionEndsAt: Date;
}) {
  const [state, action, pending] = useActionState(
    createProjectGuidanceRequestAction,
    initialState,
  );
  const [kind, setKind] = useState<ProjectGuidanceRequestKind>("MEETING");
  const [minimumMeetingAt] = useState(() => koreanDateTimeInput(new Date()));
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const fieldId = useId();
  const toastMessage = useDialogSuccessToast(state, dialogRef);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="button-primary" disabled={pending}>
        <UiText>{"새 요청 보내기"}</UiText>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { if (pending) event.preventDefault(); }}
        className={guidanceDialogClassName}
      >
        <GuidanceDialogHeader
          title="새 요청 보내기"
          description="회의나 검토에 필요한 내용과 희망 일시를 전달합니다."
          titleId={titleId}
          descriptionId={descriptionId}
          closeLabel="새 요청 닫기"
          pending={pending}
          onClose={() => dialogRef.current?.close()}
        />
        <form
          ref={formRef}
          action={action}
          aria-busy={pending}
          onReset={() => setKind("MEETING")}
          className="grid gap-5 px-5 py-6 sm:px-7"
        >
          <input type="hidden" name="teamId" value={teamId} />

          <fieldset disabled={pending} className="grid gap-2">
            <legend className="text-sm font-bold text-[var(--ink)]"><UiText>{"요청 유형"}</UiText></legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ["MEETING", "회의 요청", "희망 일시를 함께 전달합니다."],
                ["REVIEW", "검토 요청", "검토할 내용과 참고 링크를 전달합니다."],
              ] as const).map(([value, label, description]) => (
                <ChoiceCard
                  key={value}
                  className="min-h-0 px-4 py-3"
                  name="kind"
                  value={value}
                  required
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  label={label}
                  description={description}
                />
              ))}
            </div>
          </fieldset>

          <label htmlFor={`${fieldId}-title`} className="grid gap-2 text-sm font-semibold">
            <UiText>{"제목"}</UiText>
            <UiInput
              id={`${fieldId}-title`}
              name="title"
              required
              minLength={2}
              maxLength={100}
              disabled={pending}
              className="form-control"
              placeholder="요청 목적을 간단히 적어 주세요."
            />
          </label>

          <label htmlFor={`${fieldId}-content`} className="grid gap-2 text-sm font-semibold">
            <UiText>{"요청 내용"}</UiText>
            <UiTextarea
              id={`${fieldId}-content`}
              name="content"
              required
              minLength={5}
              maxLength={2000}
              rows={5}
              disabled={pending}
              className="form-control min-h-32 resize-y"
              placeholder="확인받고 싶은 내용과 필요한 배경을 구체적으로 적어 주세요."
            />
          </label>

          <label htmlFor={`${fieldId}-reference-url`} className="grid gap-2 text-sm font-semibold">
            <span><UiText>{"참고 링크"}</UiText> <span className="font-normal text-[var(--muted)]"><UiText>{"(선택)"}</UiText></span></span>
            <UiInput
              id={`${fieldId}-reference-url`}
              name="referenceUrl"
              type="url"
              maxLength={2048}
              disabled={pending}
              className="form-control"
              placeholder="https://"
            />
          </label>

          {kind === "MEETING" ? (
            <label htmlFor={`${fieldId}-preferred-at`} className="grid gap-2 text-sm font-semibold">
              <UiText>{"희망 일시"}</UiText>
              <DateTimeInput
                id={`${fieldId}-preferred-at`}
                name="preferredAt"
                required
                min={minimumMeetingAt}
                max={koreanDateTimeInput(executionEndsAt)}
                disabled={pending}
              />
            </label>
          ) : null}

          <ActionFeedback state={state} />
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialogRef.current?.close()} disabled={pending} className="button-quiet"><UiText>{"취소"}</UiText></button>
            <button disabled={pending} className="button-primary min-h-11">
              <UiText>{pending ? "요청 중" : "요청 보내기"}</UiText>
            </button>
          </div>
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}

export function ProjectGuidanceResponseForm({
  teamId,
  requestId,
  kind,
  executionEndsAt,
}: {
  teamId: string;
  requestId: string;
  kind: ProjectGuidanceRequestKind;
  executionEndsAt: Date;
}) {
  const [state, action, pending] = useActionState(
    respondProjectGuidanceRequestAction,
    initialState,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const fieldId = useId();
  const [minimumScheduledAt] = useState(() => koreanDateTimeInput(new Date()));
  const toastMessage = useDialogSuccessToast(state, dialogRef);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="button-secondary">
        <UiText>{"답변하기"}</UiText>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { if (pending) event.preventDefault(); }}
        className={guidanceDialogClassName}
      >
        <GuidanceDialogHeader
          title="지도 답변"
          description="요청을 확인하고 답변과 확정 일시를 남깁니다."
          titleId={titleId}
          descriptionId={descriptionId}
          closeLabel="요청 답변 닫기"
          pending={pending}
          onClose={() => dialogRef.current?.close()}
        />
        <form
          action={action}
          aria-busy={pending}
          className="grid gap-4 px-5 py-6 sm:px-7"
        >
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="requestId" value={requestId} />

          <label htmlFor={`${fieldId}-response`} className="grid gap-2 text-sm font-semibold">
            <UiText>{"답변"}</UiText>
            <UiTextarea
              id={`${fieldId}-response`}
              name="response"
              required
              minLength={2}
              maxLength={2000}
              rows={4}
              disabled={pending}
              className="form-control min-h-28 resize-y"
              placeholder="요청에 대한 답변과 다음 행동을 적어 주세요."
            />
          </label>

          {kind === "MEETING" ? (
            <label htmlFor={`${fieldId}-scheduled-at`} className="grid gap-2 text-sm font-semibold">
              <span><UiText>{"확정 일시"}</UiText> <span className="font-normal text-[var(--muted)]"><UiText>{"(선택)"}</UiText></span></span>
              <DateTimeInput
                id={`${fieldId}-scheduled-at`}
                name="scheduledAt"
                min={minimumScheduledAt}
                max={koreanDateTimeInput(executionEndsAt)}
                disabled={pending}
              />
            </label>
          ) : null}

          <ActionFeedback state={state} />
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => dialogRef.current?.close()} disabled={pending} className="button-quiet"><UiText>{"취소"}</UiText></button>
            <button disabled={pending} className="button-primary min-h-11">
              <UiText>{pending ? "답변 중" : "답변 보내기"}</UiText>
            </button>
          </div>
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}

export function CancelProjectGuidanceRequestForm({
  teamId,
  requestId,
}: {
  teamId: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(
    cancelProjectGuidanceRequestAction,
    initialState,
  );

  return (
    <form action={action} aria-busy={pending} className="grid gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="requestId" value={requestId} />
      <ConfirmSubmitButton
        disabled={pending}
        aria-label={pending ? "요청 취소 중" : "요청 취소"}
        className="button-quiet min-h-11 text-[var(--danger)]"
        confirmMessage="이 요청을 취소하시겠습니까?"
      >
        <UiText>{pending ? "취소 중" : "요청 취소"}</UiText>
      </ConfirmSubmitButton>
      <ActionFeedback state={state} />
    </form>
  );
}
