"use client";

import { useActionState } from "react";

import { createDiscussionPostAction } from "@/app/teams/[teamId]/_actions/team-workspace-actions";
import { initialTeamActionState } from "@/app/teams/[teamId]/_lib/team-form-state";

export function DiscussionPostForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(createDiscussionPostAction, initialTeamActionState);

  return (
    <form action={action} className="grid gap-3 rounded-[var(--radius-panel)] bg-[var(--surface-subtle)] p-4 sm:p-5">
      <input type="hidden" name="teamId" value={teamId} />
      <textarea name="content" aria-label="토론 내용" required maxLength={2000} rows={3} placeholder="팀에 질문이나 의견을 남기세요" className="field" />
      <button disabled={pending} className="button-primary justify-self-start max-sm:w-full">{pending ? "등록 중" : "의견 남기기"}</button>
      {state.message ? <p aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>{state.message}</p> : null}
    </form>
  );
}
