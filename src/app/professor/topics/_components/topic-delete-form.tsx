"use client";

import { useActionState } from "react";

import { deleteTopicDraftAction, type TopicDeleteActionState } from "@/app/professor/topics/_actions/topic-management-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: TopicDeleteActionState = { status: "idle", message: "" };

export function TopicDeleteForm({ topicId, topicTitle }: { topicId: string; topicTitle: string }) {
  const [state, action, pending] = useActionState(deleteTopicDraftAction, initialState);
  return (
    <form action={action}>
      <input type="hidden" name="topicId" value={topicId} />
      <ConfirmSubmitButton className="button-danger" disabled={pending} confirmMessage={`‘${topicTitle}’ 초안을 영구 삭제하시겠습니까? 지원·승인·팀 기록이 있으면 삭제되지 않습니다.`}><UiText>{pending ? "삭제 중" : "초안 삭제"}</UiText></ConfirmSubmitButton>
      {state.message ? <p role="alert" className="mt-2 text-xs text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
    </form>
  );
}
