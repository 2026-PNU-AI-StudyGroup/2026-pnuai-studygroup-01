"use client";

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
        <ConfirmSubmitButton className="button-danger" confirmMessage="이 팀원 지원을 거절하시겠습니까?" disabled={pending}>
          {pending ? "처리 중" : "거절"}
        </ConfirmSubmitButton>
      ) : (
        <button className="button-primary" disabled={pending}>{pending ? "처리 중" : "수락"}</button>
      )}
      {state.message ? (
        <p aria-live="polite" className={`mt-1 text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
