"use client";

import { useActionState } from "react";

import {
  inviteProjectAssistantAction,
  respondProjectAssistantInvitationAction,
  type ProjectAssistantActionState,
} from "@/app/_actions/project-assistant-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const initialState: ProjectAssistantActionState = {
  status: "idle",
  message: "",
};

export function InviteProjectAssistantForm({ topicId }: { topicId: string }) {
  const [state, action, pending] = useActionState(
    inviteProjectAssistantAction,
    initialState,
  );
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <input type="hidden" name="topicId" value={topicId} />
      <label className="grid gap-1.5">
        <span className="text-sm font-bold"><UiText>{"사용자 이메일"}</UiText></span>
        <input
          className="field"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="user@example.com"
        />
      </label>
      <button className="button-primary self-end" type="submit" disabled={pending}>
        <UiText>{pending ? "초대 중" : "조교 초대"}</UiText>
      </button>
      {state.message ? (
        <p
          className={`text-sm sm:col-span-2 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
          role="status"
        >
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}

export function ProjectAssistantInvitationDecisionForm({
  invitationId,
}: {
  invitationId: string;
}) {
  const [state, action, pending] = useActionState(
    respondProjectAssistantInvitationAction,
    initialState,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      <button
        className="button-primary"
        type="submit"
        name="decision"
        value="ACCEPT"
        disabled={pending}
      >
        <UiText>{"수락"}</UiText>
      </button>
      <button
        className="button-secondary"
        type="submit"
        name="decision"
        value="DECLINE"
        disabled={pending}
      >
        <UiText>{"거절"}</UiText>
      </button>
      {state.message ? <p className="basis-full text-sm" role="status"><UiText>{state.message}</UiText></p> : null}
    </form>
  );
}
