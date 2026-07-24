"use client";

import { useActionState } from "react";

import {
  changeTopicStatusAction,
  type TopicStatusActionState,
} from "@/app/professor/topics/_actions/topic-management-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: TopicStatusActionState = { status: "idle", message: "" };

export function TopicStatusButton({
  topicId,
  status,
  programStatus,
}: {
  topicId: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  programStatus: "DRAFT" | "OPEN" | "CLOSED";
}) {
  const [state, action, pending] = useActionState(
    changeTopicStatusAction,
    initialState,
  );

  if (status === "CLOSED") {
    return null;
  }
  if (status === "DRAFT" && programStatus !== "OPEN") {
    return <p className="muted text-sm">프로그램 마감</p>;
  }

  const intent = status === "DRAFT" ? "publish" : "close";

  return (
    <form action={action}>
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="intent" value={intent} />
      {intent === "close" ? <ConfirmSubmitButton disabled={pending} className="button-danger text-sm" confirmMessage="주제를 마감하면 더 이상 지원할 수 없습니다. 계속하시겠습니까?">{pending ? "처리 중" : "마감"}</ConfirmSubmitButton> : <button type="submit" disabled={pending} className="button-primary text-sm">{pending ? "처리 중" : "공개"}</button>}
      {state.message ? (
        <p
          aria-live="polite"
          className={`mt-2 text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
