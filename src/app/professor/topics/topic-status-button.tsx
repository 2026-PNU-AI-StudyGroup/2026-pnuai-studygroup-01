"use client";

import { useActionState } from "react";

import {
  changeTopicStatusAction,
  type TopicStatusActionState,
} from "@/app/professor/topics/actions";

const initialState: TopicStatusActionState = { status: "idle", message: "" };

export function TopicStatusButton({
  topicId,
  status,
}: {
  topicId: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
}) {
  const [state, action, pending] = useActionState(
    changeTopicStatusAction,
    initialState,
  );

  if (status === "CLOSED") {
    return null;
  }

  const intent = status === "DRAFT" ? "publish" : "close";

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="intent" value={intent} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50"
      >
        {pending ? "처리 중" : intent === "publish" ? "공개" : "마감"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`mt-2 text-sm ${state.status === "error" ? "text-red-700" : "text-green-700"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
