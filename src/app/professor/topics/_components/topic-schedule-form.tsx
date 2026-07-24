"use client";

import { useActionState } from "react";

import { type TopicScheduleActionState, updateTopicScheduleAction } from "@/app/professor/topics/_actions/topic-management-actions";

const initialState: TopicScheduleActionState = { status: "idle", message: "" };
const fields = [["모집 시작", "recruitmentStartsAt"], ["모집 종료", "recruitmentEndsAt"], ["수행 시작", "executionStartsAt"], ["수행 종료", "executionEndsAt"], ["제출 시작", "submissionStartsAt"], ["제출 종료", "submissionEndsAt"]] as const;

export function TopicScheduleForm({ topicId, values }: { topicId: string; values: Record<(typeof fields)[number][1], string> }) {
  const [state, action, pending] = useActionState(updateTopicScheduleAction, initialState);
  return <form action={action} className="grid gap-5 rounded-[var(--radius-panel)] border border-white bg-white/86 p-5 shadow-[0_18px_45px_rgba(23,32,51,.08)] backdrop-blur sm:grid-cols-2 sm:p-7">
    <input type="hidden" name="topicId" value={topicId} />
    {fields.map(([label, name]) => <label key={name} className="grid gap-2 text-sm font-semibold">{label}<input className="field" type="datetime-local" name={name} required defaultValue={values[name]} /></label>)}
    <p className="muted text-sm sm:col-span-2">모집·수행·제출 기간은 서로 겹칠 수 있지만, 각 시작 시각은 해당 종료 시각보다 앞서야 합니다.</p>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold sm:col-span-2 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
    <div className="flex justify-end border-t border-[var(--line)] pt-5 sm:col-span-2"><button className="button-primary max-sm:w-full" disabled={pending}>{pending ? "변경 중" : "일정 저장"}</button></div>
  </form>;
}
