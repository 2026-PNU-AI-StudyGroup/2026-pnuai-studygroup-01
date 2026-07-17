"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  applyTopicAction,
  type ApplyTopicActionState,
} from "@/app/topics/actions";
import type { PublicTopicSummary } from "@/modules/topic/application/topic-ports";

const initialState: ApplyTopicActionState = { status: "idle", message: "" };
const TOAST_DURATION_MS = 3_000;

type ApplicationQuestion = PublicTopicSummary["applicationQuestions"][number];

function ApplicationAnswerField({ question }: { question: ApplicationQuestion }) {
  const [value, setValue] = useState("");
  const descriptionId = useId();
  const common = {
    name: `answer:${question.id}`,
    maxLength: question.maxLength,
    required: question.required,
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(event.target.value),
    className: "field",
    "aria-describedby": descriptionId,
  };
  return <label className="grid gap-2 text-sm font-semibold sm:col-span-2">{question.label} <span className="muted text-xs font-medium">{question.required ? "필수" : "선택"}</span>{question.maxLength <= 200 ? <input {...common} /> : <textarea {...common} rows={5} />}<span id={descriptionId} className="muted text-right text-xs">{value.length} / {question.maxLength}자</span></label>;
}

export function ApplyTopicForm({ topicId, topicTitle, applicationMode, applicationQuestions, capacity }: {
  topicId: string;
  topicTitle: string;
  applicationMode: PublicTopicSummary["applicationMode"];
  applicationQuestions: PublicTopicSummary["applicationQuestions"];
  capacity: number;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [kind, setKind] = useState<"INDIVIDUAL" | "TEAM">(applicationMode === "TEAM_ONLY" ? "TEAM" : "INDIVIDUAL");
  const [state, action, pending] = useActionState(applyTopicAction, initialState);

  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    const timer = window.setTimeout(() => {
      router.refresh();
    }, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [router, state.status]);

  function openDialog() {
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (!pending) dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={state.status === "success"}
        className="button-secondary w-full"
      >
        {state.status === "success" ? "지원 접수됨" : "지원하기"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]"
      >
        <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="eyebrow">{applicationMode === "TEAM_ONLY" ? "팀 지원" : applicationMode === "INDIVIDUAL_ONLY" ? "개인 지원" : "개인·팀 지원"}</p>
            <h2 id={titleId} className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">
              지원서 작성
            </h2>
            <p id={descriptionId} className="muted mt-2 [overflow-wrap:anywhere]">
              {topicTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            disabled={pending}
            aria-label="지원서 닫기"
            className="button-quiet min-w-11 shrink-0 px-0 text-xl"
          >
            ×
          </button>
        </div>

        <form action={action} className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
          <input type="hidden" name="topicId" value={topicId} />
          {applicationMode === "INDIVIDUAL_OR_TEAM" ? <fieldset className="grid gap-3 sm:col-span-2"><legend className="font-semibold">지원 방식</legend><div className="grid gap-3 sm:grid-cols-2"><label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-[var(--line)] p-4 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-subtle)]"><input type="radio" name="kind" value="INDIVIDUAL" checked={kind === "INDIVIDUAL"} onChange={() => setKind("INDIVIDUAL")} /><span><strong className="block">개인 지원</strong><span className="muted text-xs">혼자 지원서를 제출합니다.</span></span></label><label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-[var(--line)] p-4 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-subtle)]"><input type="radio" name="kind" value="TEAM" checked={kind === "TEAM"} onChange={() => setKind("TEAM")} /><span><strong className="block">팀 지원</strong><span className="muted text-xs">팀원 전원 수락 후 접수됩니다.</span></span></label></div></fieldset> : <input type="hidden" name="kind" value={kind} />}
          {kind === "TEAM" ? <label className="grid gap-2 text-sm font-semibold sm:col-span-2">함께 지원할 팀원 이메일<textarea name="inviteeEmails" rows={3} required className="field" placeholder="student1@pusan.ac.kr, student2@pusan.ac.kr" /><span className="muted text-xs">본인을 제외하고 부산대학교 이메일을 쉼표 또는 줄바꿈으로 입력하세요. 전체 팀은 최대 {capacity}명입니다.</span></label> : null}
          <div className="border-t border-[var(--line)] pt-5 sm:col-span-2"><h3 className="font-semibold">교수 지정 지원서</h3><p className="muted mt-1 text-sm">필수 여부와 글자 수 제한에 맞춰 작성해 주세요.</p></div>
          {applicationQuestions.map((question) => <ApplicationAnswerField key={question.id} question={question} />)}
          {state.status === "error" ? (
            <p role="alert" className="text-sm font-semibold text-[var(--danger)] sm:col-span-2">
              {state.message}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeDialog} disabled={pending} className="button-quiet">
              취소
            </button>
            <button type="submit" disabled={pending} className="button-primary">
              {pending ? "처리 중" : kind === "TEAM" ? "팀원 초대 보내기" : "지원서 제출"}
            </button>
          </div>
        </form>
      </dialog>

      {state.status === "success" ? (
        <div
          role="status"
          aria-live="polite"
          className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6"
        >
          {state.message}
        </div>
      ) : null}
    </>
  );
}
