"use client";

import { useActionState } from "react";

import { withdrawTopicApprovalAction, type TopicApprovalActionState } from "@/app/_actions/topic-approval-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const initialState: TopicApprovalActionState = { status: "idle", message: "" };

export function StudentRegistrationWithdrawalForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(withdrawTopicApprovalAction, initialState);

  return (
    <form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <button type="submit" className="button-secondary text-[var(--danger)]" disabled={pending}>
        <UiText>{pending ? "철회 중" : "철회"}</UiText>
      </button>
      {state.status === "error" ? <p role="alert" className="mt-2 max-w-56 text-right text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
    </form>
  );
}
