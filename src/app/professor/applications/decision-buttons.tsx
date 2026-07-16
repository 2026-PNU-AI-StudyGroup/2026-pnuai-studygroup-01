"use client";

import { useActionState } from "react";

import {
  decideTopicApplicationAction,
  type DecisionActionState,
} from "@/app/professor/applications/actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: DecisionActionState = { status: "idle", message: "" };

export function DecisionButtons({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState(
    decideTopicApplicationAction,
    initialState,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 lg:justify-end">
      <input type="hidden" name="applicationId" value={applicationId} />
      <button
        name="decision"
        value="accept"
        disabled={pending}
        className="button-primary text-sm"
      >
        수락
      </button>
      <ConfirmSubmitButton
        name="decision"
        value="reject"
        disabled={pending}
        className="button-danger text-sm"
        confirmMessage="이 주제 지원을 거절하시겠습니까?"
      >
        거절
      </ConfirmSubmitButton>
      {state.message ? (
        <p
          aria-live="polite"
          className={`w-full text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
