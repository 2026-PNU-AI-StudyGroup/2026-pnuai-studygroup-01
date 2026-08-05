"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { confirmTeamAction } from "@/app/teams/[teamId]/_actions/team-workspace-actions";
import { initialTeamActionState } from "@/app/teams/[teamId]/_lib/team-form-state";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

export function ConfirmTeamForm({
  teamId,
  className,
  buttonClassName = "button-primary",
}: {
  teamId: string;
  className?: string;
  buttonClassName?: string;
}) {
  const [state, action, pending] = useActionState(confirmTeamAction, initialTeamActionState);

  return (
    <form action={action} className={className}>
      <input type="hidden" name="teamId" value={teamId} />
      <ConfirmSubmitButton
        disabled={pending}
        className={buttonClassName}
        confirmMessage="팀을 확정하면 구성원을 기준으로 프로젝트 운영을 시작합니다. 확정하시겠습니까?"
      >
        <UiText>{pending ? "확정 중" : "팀 확정"}</UiText>
      </ConfirmSubmitButton>
      {state.status === "error" ? (
        <span role="alert" className="mt-2 block text-xs text-[var(--danger)]">
          <UiText>{state.message}</UiText>
        </span>
      ) : null}
    </form>
  );
}
