"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

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
  topicTitle: string;
  values: Record<(typeof fields)[number][1], string>;
};

export function TopicScheduleForm({ topicId, topicTitle, values }: TopicScheduleFormProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(updateTopicScheduleAction, initialState);
  const [dismissedSuccess, setDismissedSuccess] = useState<TopicScheduleActionState | null>(null);
  const toastMessage = state.status === "success" && state !== dismissedSuccess ? state.message : "";
  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    const timer = window.setTimeout(() => {
      setDismissedSuccess(state);
      router.refresh();
    }, 3_000);
    return () => window.clearTimeout(timer);
  }, [router, state]);
  return (
    <>
      <button type="button" className="button-quiet" onClick={() => dialogRef.current?.showModal()}>일정 변경</button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]">
        <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7"><div><p className="eyebrow">주제 일정</p><h3 id={titleId} className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">{topicTitle}</h3><p className="muted mt-2 text-sm">모집·수행·제출 기간은 서로 겹칠 수 있습니다.</p></div><button type="button" aria-label="주제 일정 변경 닫기" disabled={pending} onClick={() => dialogRef.current?.close()} className="button-quiet min-w-11 shrink-0 px-0 text-xl">×</button></div>
        <form action={action} className="grid gap-4 px-5 py-6 sm:grid-cols-2 sm:px-7">
          <input type="hidden" name="topicId" value={topicId} />
          {fields.map(([label, name]) => <label key={name} className="grid gap-2 text-sm font-medium">{label}<input className="field" type="datetime-local" name={name} required defaultValue={values[name]} /></label>)}
          <p className="muted text-sm sm:col-span-2">각 시작 시각은 해당 종료 시각보다 앞서야 합니다.</p>
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)] sm:col-span-2">{state.message}</p> : null}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:col-span-2 sm:flex-row sm:justify-end"><button type="button" className="button-quiet" disabled={pending} onClick={() => dialogRef.current?.close()}>취소</button><button className="button-primary" disabled={pending}>{pending ? "변경 중" : "일정 저장"}</button></div>
        </form>
      </dialog>
      {toastMessage ? <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6">{toastMessage}</div> : null}
    </>
  );
}
