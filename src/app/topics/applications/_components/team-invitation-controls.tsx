"use client";

import { useActionState } from "react";

import { cancelTeamApplicationDraftAction, respondToTeamInvitationAction, type TeamInvitationActionState } from "@/app/topics/applications/_actions/topic-application-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: TeamInvitationActionState = { status: "idle", message: "" };

export function TeamInvitationResponseForm({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(respondToTeamInvitationAction, initialState);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      <div className="flex flex-wrap gap-2">
        <button className="button-primary" name="decision" value="ACCEPT" disabled={pending}>{pending ? "처리 중" : "참여 수락"}</button>
        <ConfirmSubmitButton className="button-quiet" name="decision" value="DECLINE" disabled={pending} confirmMessage="팀 지원 초대를 거절하시겠습니까?">거절</ConfirmSubmitButton>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function CancelTeamApplicationDraftForm({ draftId }: { draftId: string }) {
  const [state, action, pending] = useActionState(cancelTeamApplicationDraftAction, initialState);
  return (
    <form action={action} className="grid justify-items-end gap-2">
      <input type="hidden" name="draftId" value={draftId} />
      <ConfirmSubmitButton className="button-danger" disabled={pending} confirmMessage="팀 지원 준비와 모든 초대를 취소하시겠습니까?">
        {pending ? "취소 중" : "지원 준비 취소"}
      </ConfirmSubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}

function ActionMessage({ state }: { state: TeamInvitationActionState }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p>;
}
