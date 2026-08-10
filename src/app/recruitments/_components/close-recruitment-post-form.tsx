"use client";

import { useActionState } from "react";

import { closeRecruitmentPostAction } from "@/app/recruitments/_actions/recruitment-actions";
import { initialRecruitmentActionState } from "@/app/recruitments/_lib/recruitment-form-state";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

export function CloseRecruitmentPostForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(closeRecruitmentPostAction, initialRecruitmentActionState);
  return (
    <form action={action} className="grid justify-items-end gap-1">
      <input type="hidden" name="postId" value={postId} />
      <ConfirmSubmitButton className="button-quiet text-xs text-[var(--danger)]" disabled={pending} confirmMessage="모집을 종료하면 새 지원과 지원자 처리를 할 수 없습니다. 계속할까요?"><UiText>{"모집 종료"}</UiText></ConfirmSubmitButton>
      {state.message ? <span role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-xs text-[var(--danger)]" : "text-xs text-[var(--success)]"}><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}
