"use client";

import { useActionState } from "react";

import { closeTeamAction } from "@/app/teams/[teamId]/_actions/team-workspace-actions";
import { initialTeamActionState } from "@/app/teams/[teamId]/_lib/team-form-state";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

export function CloseTeamForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(closeTeamAction, initialTeamActionState);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <ConfirmSubmitButton
        disabled={pending}
        className="button-danger"
        confirmMessage="팀을 종료하면 마일스톤과 보고서를 더 이상 수정할 수 없습니다. 승인된 최종 보고서를 확인하고 종료하시겠습니까?"
      >
        {pending ? "종료 중" : "팀 종료"}
      </ConfirmSubmitButton>
      {state.status === "error" ? <span role="alert" className="text-xs text-[var(--danger)]">{state.message}</span> : null}
    </form>
  );
}
