"use client";

import { useActionState, useEffect, useRef, useState } from "react";

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
  const [developerName, setDeveloperName] = useState("");

  const toggleAction = toggleFeedbackResolvedAction.bind(null, postId, !resolved);
  const [toggleState, toggleFormAction, toggling] = useActionState(toggleAction, feedbackInitialState);

  const commentAction = addFeedbackCommentAction.bind(null, postId);
  const [commentState, commentFormAction, commenting] = useActionState(commentAction, feedbackInitialState);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (commentState.status === "success" && commentRef.current) commentRef.current.value = "";
  }, [commentState]);

  return (
    <div className="mt-4 grid gap-4 border-t border-dashed border-[var(--line)] pt-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--muted)]"><UiText>{"개발자"}</UiText></span>
        <UiInput
          className="field h-9 max-w-52 bg-white py-1 text-sm"
          type="text"
          maxLength={FEEDBACK_LIMITS.name}
          placeholder="개발자 이름"
          value={developerName}
          onChange={(event) => setDeveloperName(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action={toggleFormAction}>
          <input type="hidden" name="developerName" value={developerName} />
          <button className={resolved ? "button-secondary" : "button-primary"} type="submit" disabled={toggling}>
            <UiText>{resolved ? "미해결로 변경" : "해결 처리"}</UiText>
          </button>
        </form>
        <Notice state={toggleState} />
      </div>

      <form action={commentFormAction} className="grid gap-2">
        <input type="hidden" name="developerName" value={developerName} />
        <UiTextarea
          ref={commentRef}
          className="field min-h-16 bg-white text-sm leading-6"
          name="body"
          maxLength={FEEDBACK_LIMITS.comment}
          placeholder="개발자 코멘트를 남겨 주세요."
        />
        <div className="flex items-center gap-3">
          <button className="button-secondary" type="submit" disabled={commenting}>
            <UiText>{"코멘트 추가"}</UiText>
          </button>
          <Notice state={commentState} />
        </div>
      </form>
    </div>
  );
}
