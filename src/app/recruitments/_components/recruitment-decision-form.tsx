"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { decideRecruitmentAction } from "@/app/recruitments/_actions/recruitment-actions";
import { initialRecruitmentActionState } from "@/app/recruitments/_lib/recruitment-form-state";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

export function RecruitmentDecisionForm({
  applicationId,
  postId,
  decision,
}: {
  applicationId: string;
  postId: string;
  decision: "ACCEPT" | "REJECT";
}) {
  const [state, action, pending] = useActionState(
    decideRecruitmentAction,
    initialRecruitmentActionState,
  );

  return (
    <form action={action}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="decision" value={decision} />
      {decision === "REJECT" ? (
        <ConfirmSubmitButton className="button-danger" confirmMessage="지원자를 거절하시겠습니까?" disabled={pending}>
          <UiText>{pending ? "처리 중" : "거절"}</UiText>
        </ConfirmSubmitButton>
      ) : (
        <ConfirmSubmitButton className="button-primary" confirmClassName="button-primary" confirmMessage="이 지원자를 팀에 수락합니다. 정원이 차면 모집은 자동 종료됩니다." disabled={pending}><UiText>{pending ? "처리 중" : "수락"}</UiText></ConfirmSubmitButton>
      )}
      {state.message ? (
        <p aria-live="polite" className={`mt-1 text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
