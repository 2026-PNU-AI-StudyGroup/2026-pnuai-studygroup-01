"use client";

import { useActionState } from "react";

import {
  respondProjectTeamInvitationAction,
  type ProjectTeamInvitationActionState,
} from "@/app/_actions/project-team-invitation-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const initialState: ProjectTeamInvitationActionState = { status: "idle", message: "" };

/** 프로젝트 팀 초대를 받은 사람이 참여 여부를 고르는 자리. */
export function ProjectTeamInvitationDecisionForm({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(respondProjectTeamInvitationAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      <button className="button-primary" type="submit" name="intent" value="ACCEPT" disabled={pending}>
        <UiText>{"수락"}</UiText>
      </button>
      <button className="button-secondary" type="submit" name="intent" value="DECLINE" disabled={pending}>
        <UiText>{"거절"}</UiText>
      </button>
      {state.message ? (
        <p className="basis-full text-sm" role={state.status === "error" ? "alert" : "status"}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
