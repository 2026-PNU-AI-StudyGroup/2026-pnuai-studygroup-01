"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { ApplicationAnswerField } from "@/app/topics/_components/application-answer-field";
import { type ApplicationKind, ApplicationKindField } from "@/app/topics/_components/application-kind-field";
import { TeamMemberEmailField } from "@/app/topics/_components/team-member-email-field";
import { applyTopicAction, type ApplyTopicActionState } from "@/app/topics/_actions/topic-explorer-actions";
import type { PublicTopicSummary } from "@/modules/topic/application/topic-ports";

const initialState: ApplyTopicActionState = { status: "idle", message: "" };
const TOAST_DURATION_MS = 3_000;

function initialApplicationKind(mode: PublicTopicSummary["applicationMode"]): ApplicationKind {
  return mode === "TEAM_ONLY" ? "TEAM" : "INDIVIDUAL";
}

function applicationModeLabel(mode: PublicTopicSummary["applicationMode"]): string {
  if (mode === "TEAM_ONLY") return "팀 지원";
  if (mode === "INDIVIDUAL_ONLY") return "개인 지원";
  return "개인·팀 지원";
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
  const [kind, setKind] = useState<ApplicationKind>(() => initialApplicationKind(applicationMode));
  const [state, action, pending] = useActionState(applyTopicAction, initialState);

  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    const timer = window.setTimeout(() => router.refresh(), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [router, state.status]);

  function closeDialog() {
    if (!pending) dialogRef.current?.close();
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} disabled={state.status === "success"} className="button-primary w-full">
        {state.status === "success" ? "지원 접수됨" : "지원하기"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { if (pending) event.preventDefault(); }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]"
      >
        <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="eyebrow">{applicationModeLabel(applicationMode)}</p>
            <h2 id={titleId} className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">지원서 작성</h2>
            <p id={descriptionId} className="muted mt-2 [overflow-wrap:anywhere]">{topicTitle}</p>
          </div>
          <button type="button" onClick={closeDialog} disabled={pending} aria-label="지원서 닫기" className="button-quiet min-w-11 shrink-0 px-0 text-xl">×</button>
        </div>

        <form action={action} className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
          <input type="hidden" name="topicId" value={topicId} />
          {applicationMode === "INDIVIDUAL_OR_TEAM"
            ? <ApplicationKindField kind={kind} onChange={setKind} />
            : <input type="hidden" name="kind" value={kind} />}
          {kind === "TEAM" ? <TeamMemberEmailField capacity={capacity} /> : null}

          <div className="border-t border-[var(--line)] pt-5 sm:col-span-2">
            <h3 className="font-semibold">교수 지정 지원서</h3>
            <p className="muted mt-1 text-sm">필수 여부와 글자 수 제한에 맞춰 작성해 주세요.</p>
          </div>
          {applicationQuestions.map((question) => <ApplicationAnswerField key={question.id} question={question} />)}
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)] sm:col-span-2">{state.message}</p> : null}

          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeDialog} disabled={pending} className="button-quiet">취소</button>
            <button type="submit" disabled={pending} className="button-primary">{pending ? "처리 중" : kind === "TEAM" ? "팀원 초대 보내기" : "지원서 제출"}</button>
          </div>
        </form>
      </dialog>

      {state.status === "success" ? (
        <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6">
          {state.message}
        </div>
      ) : null}
    </>
  );
}
