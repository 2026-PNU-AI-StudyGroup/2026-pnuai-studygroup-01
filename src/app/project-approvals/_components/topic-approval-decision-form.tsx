"use client";
import { useActionState } from "react";
import { decideTopicApprovalAction, type TopicApprovalActionState } from "@/app/project-approvals/_actions/topic-approval-actions";
const initial: TopicApprovalActionState = { status: "idle", message: "" };
export function TopicApprovalDecisionForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(decideTopicApprovalAction, initial);
  return <form action={action} className="grid gap-3">
    <input type="hidden" name="requestId" value={requestId} />
    <label className="grid gap-2 text-sm font-bold">검토 의견<textarea className="field" name="reviewComment" maxLength={1000} rows={2} placeholder="승인 또는 반려 사유를 남길 수 있습니다." /></label>
    <div className="flex justify-end gap-2"><button className="button-secondary" name="decision" value="REJECT" disabled={pending}>반려</button><button className="button-primary" name="decision" value="APPROVE" disabled={pending}>승인 및 공개</button></div>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--success)]"}>{state.message}</p> : null}
  </form>;
}
