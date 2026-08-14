"use client";

import { useActionState } from "react";

import { addAdvisorFeedbackAction, type AdvisorReviewState } from "@/app/advisor/_actions/advisor-review-actions";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";

const initialState: AdvisorReviewState = { status: "idle", message: "" };

export function AdvisorFeedbackForm({
  topicId,
  feedback,
  readOnly,
}: {
  topicId: string;
  feedback: Array<{ id: string; body: string; createdAt: Date }>;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(addAdvisorFeedbackAction, initialState);

  return (
    <div className="mt-3 space-y-4">
      {feedback.length === 0 ? (
        <p className="text-sm leading-6 text-[var(--muted)]"><UiText>{"작성한 피드백이 없습니다."}</UiText></p>
      ) : (
        <ul className="divide-y divide-[var(--line)] rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]">
          {feedback.map((entry) => (
            <li key={entry.id} className="px-5 py-4">
              <time className="muted text-xs" dateTime={entry.createdAt.toISOString()}><UiDate value={entry.createdAt} mode="dateTime" /></time>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]"><UiText>{entry.body}</UiText></p>
            </li>
          ))}
        </ul>
      )}
      {readOnly ? (
        <p className="muted text-sm"><UiText>{"프로그램이 종료되어 더 이상 작성할 수 없습니다."}</UiText></p>
      ) : (
        <form action={action} className="grid gap-3">
          <input type="hidden" name="topicId" value={topicId} />
          <label htmlFor="advisor-feedback-body" className="sr-only"><UiText>{"피드백"}</UiText></label>
          <UiTextarea
            id="advisor-feedback-body"
            name="body"
            required
            maxLength={4000}
            rows={5}
            placeholder="팀에 전달할 피드백을 작성해 주세요."
            className="form-control resize-y"
          />
          {state.message ? (
            <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              <UiText>{state.message}</UiText>
            </p>
          ) : null}
          <div><button className="button-primary" disabled={pending}><UiText>{pending ? "등록 중" : "피드백 등록"}</UiText></button></div>
        </form>
      )}
    </div>
  );
}
