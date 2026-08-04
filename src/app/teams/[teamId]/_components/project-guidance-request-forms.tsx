"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  cancelProjectGuidanceRequestAction,
  createProjectGuidanceRequestAction,
  respondProjectGuidanceRequestAction,
} from "@/app/teams/[teamId]/_actions/project-guidance-request-actions";
import { koreanDateTimeInput } from "@/app/teams/[teamId]/_lib/report-form-shared";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

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
  const formRef = useRef<HTMLFormElement>(null);
  const fieldId = useId();

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      aria-busy={pending}
      onReset={() => setKind("MEETING")}
      className="grid gap-5 border-y border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-5 sm:px-5"
    >
      <input type="hidden" name="teamId" value={teamId} />

      <fieldset disabled={pending} className="grid gap-2">
        <legend className="text-sm font-bold text-[var(--ink)]"><UiText>{"요청 유형"}</UiText></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ["MEETING", "회의 요청", "희망 일시를 함께 전달합니다."],
            ["REVIEW", "검토 요청", "검토할 내용과 참고 링크를 전달합니다."],
          ] as const).map(([value, label, description]) => (
            <label
              key={value}
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--radius-control)] border px-4 py-3 transition-colors ${
                kind === value
                  ? "border-[var(--primary)] bg-white text-[var(--ink)]"
                  : "border-[var(--line-strong)] bg-white text-[var(--muted)]"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={value}
                required
                checked={kind === value}
                onChange={() => setKind(value)}
                className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
              />
              <span>
                <strong className="block text-sm"><UiText>{label}</UiText></strong>
                <span className="mt-1 block text-xs leading-5 text-[var(--muted)]"><UiText>{description}</UiText></span>
              </span>
            </label>
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
          className="field"
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
          className="field min-h-32 resize-y"
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
          className="field"
          placeholder="https://"
        />
      </label>

      {kind === "MEETING" ? (
        <label htmlFor={`${fieldId}-preferred-at`} className="grid gap-2 text-sm font-semibold">
          <UiText>{"희망 일시"}</UiText>
          <input
            id={`${fieldId}-preferred-at`}
            name="preferredAt"
            type="datetime-local"
            required
            min={minimumMeetingAt}
            max={koreanDateTimeInput(executionEndsAt)}
            disabled={pending}
            className="field"
          />
        </label>
      ) : null}

      <ActionFeedback state={state} />
      <div className="flex justify-end">
        <button disabled={pending} className="button-primary min-h-11 max-sm:w-full">
          <UiText>{pending ? "요청 중" : "요청 보내기"}</UiText>
        </button>
      </div>
    </form>
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
  const fieldId = useId();
  const [minimumScheduledAt] = useState(() => koreanDateTimeInput(new Date()));

  return (
    <form
      action={action}
      aria-busy={pending}
      className="grid gap-4 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-subtle)] p-4 sm:p-5"
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
          className="field min-h-28 resize-y"
          placeholder="요청에 대한 답변과 다음 행동을 적어 주세요."
        />
      </label>

      {kind === "MEETING" ? (
        <label htmlFor={`${fieldId}-scheduled-at`} className="grid gap-2 text-sm font-semibold">
          <span><UiText>{"확정 일시"}</UiText> <span className="font-normal text-[var(--muted)]"><UiText>{"(선택)"}</UiText></span></span>
          <input
            id={`${fieldId}-scheduled-at`}
            name="scheduledAt"
            type="datetime-local"
            min={minimumScheduledAt}
            max={koreanDateTimeInput(executionEndsAt)}
            disabled={pending}
            className="field"
          />
        </label>
      ) : null}

      <ActionFeedback state={state} />
      <div className="flex justify-end">
        <button disabled={pending} className="button-primary min-h-11 max-sm:w-full">
          <UiText>{pending ? "답변 중" : "답변 보내기"}</UiText>
        </button>
      </div>
    </form>
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
