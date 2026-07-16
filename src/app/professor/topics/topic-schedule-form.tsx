"use client";

import { useActionState } from "react";

import {
  type TopicScheduleActionState,
  updateTopicScheduleAction,
} from "@/app/professor/topics/actions";

const initialState: TopicScheduleActionState = { status: "idle", message: "" };

const fields = [
  ["모집 시작", "recruitmentStartsAt"],
  ["모집 종료", "recruitmentEndsAt"],
  ["수행 시작", "executionStartsAt"],
  ["수행 종료", "executionEndsAt"],
  ["제출 시작", "submissionStartsAt"],
  ["제출 종료", "submissionEndsAt"],
] as const;

type TopicScheduleFormProps = {
  topicId: string;
  values: Record<(typeof fields)[number][1], string>;
};

export function TopicScheduleForm({ topicId, values }: TopicScheduleFormProps) {
  const [state, action, pending] = useActionState(updateTopicScheduleAction, initialState);
  return (
    <details className="mt-5 border-y border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 sm:px-5">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">일정 변경</summary>
      <form action={action} className="grid gap-4 border-t border-[var(--line)] py-5 sm:grid-cols-2">
        <input type="hidden" name="topicId" value={topicId} />
        {fields.map(([label, name]) => <label key={name} className="grid gap-2 text-sm font-medium">{label}<input className="field" type="datetime-local" name={name} required defaultValue={values[name]} /></label>)}
        <p className="muted text-sm sm:col-span-2">세 기간은 서로 겹칠 수 있지만 각 시작 시각은 종료 시각보다 앞서야 합니다.</p>
        <button className="button-primary justify-self-start" disabled={pending}>{pending ? "변경 중" : "일정 저장"}</button>
        {state.message ? <p aria-live="polite" className={state.status === "error" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--success)]"}>{state.message}</p> : null}
      </form>
    </details>
  );
}
