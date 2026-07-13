"use client";

import { useActionState } from "react";

import {
  decideTopicApplicationAction,
  type DecisionActionState,
} from "@/app/professor/applications/actions";

const initialState: DecisionActionState = { status: "idle", message: "" };

export function DecisionButtons({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState(
    decideTopicApplicationAction,
    initialState,
  );

  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <button
        name="decision"
        value="accept"
        disabled={pending}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        수락
      </button>
      <button
        name="decision"
        value="reject"
        disabled={pending}
        className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        거절
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`w-full text-sm ${state.status === "error" ? "text-red-700" : "text-green-700"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
