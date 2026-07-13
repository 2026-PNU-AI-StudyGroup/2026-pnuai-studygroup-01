"use client";

import { useActionState } from "react";

import {
  applyTopicAction,
  type ApplyTopicActionState,
} from "@/app/topics/actions";

const initialState: ApplyTopicActionState = { status: "idle", message: "" };

export function ApplyTopicForm({ topicId }: { topicId: string }) {
  const [state, action, pending] = useActionState(applyTopicAction, initialState);

  return (
    <form action={action} className="mt-5 grid gap-3 border-t pt-4">
      <input type="hidden" name="topicId" value={topicId} />
      <label className="grid gap-2 text-sm font-medium">
        지원 메시지
        <textarea
          name="message"
          maxLength={2000}
          required
          rows={3}
          className="rounded-lg border px-3 py-2"
          placeholder="관심 분야와 참여 동기를 작성해 주세요."
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "지원 중" : "지원하기"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={state.status === "error" ? "text-red-700" : "text-green-700"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
