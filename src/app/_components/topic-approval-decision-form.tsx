"use client";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";
import { decideTopicApprovalAction, type TopicApprovalActionState } from "@/app/_actions/topic-approval-actions";
const initial: TopicApprovalActionState = { status: "idle", message: "" };
export function TopicApprovalDecisionForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(decideTopicApprovalAction, initial);
  return <form action={action} className="grid gap-3">
    <input type="hidden" name="requestId" value={requestId} />
    <label className="grid gap-2 text-sm font-bold"><UiText>{"검토 의견"}</UiText><UiTextarea className="field" name="reviewComment" maxLength={1000} rows={2} placeholder="승인 또는 반려 사유를 남길 수 있습니다." /></label>
    <div className="flex justify-end gap-2"><button className="button-secondary" name="decision" value="REJECT" disabled={pending}><UiText>{"반려"}</UiText></button><button className="button-primary" name="decision" value="APPROVE" disabled={pending}><UiText>{"승인 및 공개"}</UiText></button></div>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}
  </form>;
}
