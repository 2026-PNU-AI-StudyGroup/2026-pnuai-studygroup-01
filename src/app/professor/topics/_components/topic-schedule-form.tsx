"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { type TopicScheduleActionState, updateTopicScheduleAction } from "@/app/professor/topics/_actions/topic-management-actions";
import { DateTimeInput } from "@/shared/ui/form-system";

const initialState: TopicScheduleActionState = { status: "idle", message: "" };
const fields = [["모집 시작", "recruitmentStartsAt"], ["수행 시작", "executionStartsAt"], ["수행 종료", "executionEndsAt"], ["제출 시작", "submissionStartsAt"], ["제출 종료", "submissionEndsAt"]] as const;

export function TopicScheduleForm({ topicId, values }: { topicId: string; values: Record<(typeof fields)[number][1], string> }) {
  const [state, action, pending] = useActionState(updateTopicScheduleAction, initialState);
  return <form action={action} className="grid gap-5 border-y border-[var(--line)] bg-white py-7 sm:grid-cols-2">
    <input type="hidden" name="topicId" value={topicId} />
    {fields.map(([label, name]) => <label key={name} className="grid gap-2 text-sm font-semibold"><UiText>{label}</UiText><DateTimeInput name={name} required defaultValue={values[name]} /></label>)}
    <p className="muted text-sm sm:col-span-2"><UiText>{"모집 마감은 프로그램 전체에 적용됩니다. 수행·제출 기간은 각 시작 시각이 종료 시각보다 앞서야 합니다."}</UiText></p>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold sm:col-span-2 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
    <div className="flex justify-end border-t border-[var(--line)] pt-5 sm:col-span-2"><button className="button-primary max-sm:w-full" disabled={pending}><UiText>{pending ? "변경 중" : "일정 저장"}</UiText></button></div>
  </form>;
}
