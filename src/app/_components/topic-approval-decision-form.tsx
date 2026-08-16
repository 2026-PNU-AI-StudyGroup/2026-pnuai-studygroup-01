"use client";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState, useEffect } from "react";
import { decideTopicApprovalAction, type TopicApprovalActionState } from "@/app/_actions/topic-approval-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
const initial: TopicApprovalActionState = { status: "idle", message: "" };
export function TopicApprovalDecisionForm({ requestId, onSuccess }: { requestId: string; onSuccess?: () => void }) {
  const [state, action, pending] = useActionState(decideTopicApprovalAction, initial);
  useEffect(() => {
    if (state.status === "success") onSuccess?.();
  }, [onSuccess, state.status]);
  return <form action={action} className="grid gap-3">
    <input type="hidden" name="requestId" value={requestId} />
    <label className="grid gap-2 text-sm font-semibold"><UiText>{"검토 의견"}</UiText><UiTextarea className="form-control" name="reviewComment" maxLength={1000} rows={2} placeholder="승인 또는 반려 사유를 남길 수 있습니다." /></label>
    <div className="flex justify-end gap-2"><button className="button-secondary" name="decision" value="REJECT" disabled={pending}><UiText>{"반려"}</UiText></button><ConfirmSubmitButton className="button-primary" name="decision" value="APPROVE" disabled={pending} confirmMessage="프로젝트를 승인하고 공개합니다. 계속할까요?"><UiText>{"승인 및 공개"}</UiText></ConfirmSubmitButton></div>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}
  </form>;
}
