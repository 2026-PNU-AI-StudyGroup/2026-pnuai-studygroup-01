"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
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
  pendingApplicationCount,
  openRecruitmentPostCount,
}: {
  topicId: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  programStatus: "DRAFT" | "OPEN" | "CLOSED";
  pendingApplicationCount: number;
  openRecruitmentPostCount: number;
}) {
  const [state, action, pending] = useActionState(
    changeTopicStatusAction,
    initialState,
  );

  if (status === "CLOSED") {
    return null;
  }
  if (status === "DRAFT" && programStatus !== "OPEN") {
    return <p className="muted text-sm"><UiText>{"프로그램 마감"}</UiText></p>;
  }

  const intent = status === "DRAFT" ? "publish" : "close";

  return (
    <form action={action}>
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="intent" value={intent} />
      {intent === "close" ? <ConfirmSubmitButton disabled={pending} className="button-danger text-sm" confirmMessage={`주제를 마감하면 대기 지원 ${pendingApplicationCount}건이 자동 미선정되고 열린 모집 글 ${openRecruitmentPostCount}건이 닫힙니다. 이 작업은 취소할 수 없습니다. 계속하시겠습니까?`}><UiText>{pending ? "처리 중" : "마감"}</UiText></ConfirmSubmitButton> : <button type="submit" disabled={pending} className="button-primary text-sm"><UiText>{pending ? "처리 중" : "공개"}</UiText></button>}
      {state.message ? (
        <p
          aria-live="polite"
          className={`mt-2 text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
        >
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
