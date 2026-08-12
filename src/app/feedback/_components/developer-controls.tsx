"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  addFeedbackCommentAction,
  toggleFeedbackResolvedAction,
} from "@/app/feedback/_actions/feedback-actions";
import { FEEDBACK_LIMITS, feedbackInitialState } from "@/app/feedback/_lib/feedback-options";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

function Notice({ state }: { state: { status: string; message: string } }) {
  if (!state.message) return null;
  return (
    <p className={`text-xs font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`} role="status">
      <UiText>{state.message}</UiText>
    </p>
  );
}

export function DeveloperControls({ postId, resolved }: { postId: string; resolved: boolean }) {

  const toggleAction = toggleFeedbackResolvedAction.bind(null, postId, !resolved);
  const [toggleState, toggleFormAction, toggling] = useActionState(toggleAction, feedbackInitialState);

  const commentAction = addFeedbackCommentAction.bind(null, postId);
  const [commentState, commentFormAction, commenting] = useActionState(commentAction, feedbackInitialState);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (commentState.status === "success" && commentRef.current) commentRef.current.value = "";
  }, [commentState]);

  return (
    <details className="group mt-1 border-t border-dashed border-[var(--line)] pt-3">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-[var(--radius-control)] px-3 text-xs font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
        <UiText>{"운영 처리"}</UiText>
      </summary>
      <div className="mt-2 grid gap-3 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-3 sm:p-4">
        <form action={toggleFormAction} className="grid gap-2">
          <UiInput
            className="form-control h-9 bg-white py-1 text-sm"
            type="text"
            name="note"
            maxLength={FEEDBACK_LIMITS.comment}
            placeholder="처리 메모 (선택)"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button className={resolved ? "button-secondary" : "button-primary"} type="submit" disabled={toggling}>
              <UiText>{resolved ? "미해결로 변경" : "해결 처리"}</UiText>
            </button>
            <Notice state={toggleState} />
          </div>
        </form>

        <form action={commentFormAction} className="grid gap-2">
          <UiTextarea
            ref={commentRef}
            className="form-control min-h-16 bg-white text-sm leading-6"
            name="body"
            maxLength={FEEDBACK_LIMITS.comment}
            placeholder="처리 답변을 남겨 주세요."
          />
          <div className="flex items-center gap-3">
            <button className="button-secondary" type="submit" disabled={commenting}>
              <UiText>{"답변 추가"}</UiText>
            </button>
            <Notice state={commentState} />
          </div>
        </form>
      </div>
    </details>
  );
}
