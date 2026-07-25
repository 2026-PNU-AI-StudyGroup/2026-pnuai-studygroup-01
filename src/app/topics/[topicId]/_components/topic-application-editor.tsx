"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { ApplicationAnswerField } from "@/app/topics/_components/application-answer-field";
import { type ApplicationKind } from "@/app/topics/_components/application-kind-field";
import { applyTopicAction, type ApplyTopicActionState } from "@/app/topics/_actions/topic-explorer-actions";
import type { PublicTopicSummary } from "@/modules/topic/application/topic-ports";
import { CustomSelect } from "@/shared/ui/custom-select";

const initialState: ApplyTopicActionState = { status: "idle", message: "" };
const TOAST_DURATION_MS = 3_000;

function initialApplicationKind(mode: PublicTopicSummary["applicationMode"]): ApplicationKind {
  return mode === "TEAM_ONLY" ? "TEAM" : "INDIVIDUAL";
}

function applicationModeLabel(mode: PublicTopicSummary["applicationMode"]) {
  if (mode === "TEAM_ONLY") return "팀 지원";
  if (mode === "INDIVIDUAL_ONLY") return "개인 지원";
  return "개인 또는 팀 지원";
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 fill-none stroke-current stroke-[1.75]">
      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
    </svg>
  );
}

export function TopicApplicationEditor({ topicId, topicTitle, applicationMode, applicationQuestions, capacity, leaderTeams }: {
  topicId: string;
  topicTitle: string;
  applicationMode: PublicTopicSummary["applicationMode"];
  applicationQuestions: PublicTopicSummary["applicationQuestions"];
  capacity: number;
  leaderTeams: Array<{ id: string; name: string; memberCount: number }>;
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
        {state.status === "success" ? "지원 접수됨" : "이 프로젝트에 지원"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { if (pending) event.preventDefault(); }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]"
      >
        <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)]">
          <header className="border-b border-[var(--line)] bg-[var(--primary-subtle)] px-6 py-7 lg:border-b-0 lg:border-r lg:px-8 lg:py-9">
            <p className="text-xs font-black text-[var(--primary)]">{applicationModeLabel(applicationMode)}</p>
            <h2 id={titleId} className="mt-3 text-3xl font-black leading-[1.08] tracking-[-0.045em]">지원서 작성</h2>
            <p id={descriptionId} className="mt-5 font-bold leading-6 [overflow-wrap:anywhere]">{topicTitle}</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">필수 항목을 확인하고 한 번에 제출합니다. 팀 지원은 팀장만 현재 팀 구성으로 접수할 수 있습니다.</p>
          </header>

          <form action={action} className="grid gap-7 px-6 py-7 sm:px-8 lg:px-10 lg:py-9">
            <input type="hidden" name="topicId" value={topicId} />
            {applicationMode === "INDIVIDUAL_OR_TEAM" ? (
              <fieldset>
                <legend className="text-sm font-bold">지원 방식</legend>
                <div className="mt-3 grid border-y border-[var(--line)] sm:grid-cols-2 sm:divide-x sm:divide-[var(--line)]">
                  {([
                    ["INDIVIDUAL", "개인 지원", "혼자 지원서를 제출합니다."],
                    ["TEAM", "팀 지원", "내가 팀장인 지속형 팀으로 지원합니다."],
                  ] as const).map(([value, label, description]) => (
                    <label key={value} className="flex cursor-pointer gap-3 px-1 py-4 sm:px-4">
                      <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
                      <span><strong className="block">{label}</strong><span className="mt-1 block text-xs text-[var(--muted)]">{description}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : <input type="hidden" name="kind" value={kind} />}

            {kind === "TEAM" ? (
              <label className="grid gap-2 text-sm font-bold">
                지원할 팀
                <CustomSelect
                  name="studentTeamId"
                  required
                  placeholder="팀을 선택하세요"
                  options={leaderTeams.filter((team) => team.memberCount <= capacity).map((team) => ({
                    value: team.id,
                    label: team.name,
                    description: `${team.memberCount}명`,
                  }))}
                />
                <span className="text-xs font-normal leading-5 text-[var(--muted)]">팀장인 팀만 표시됩니다. 프로젝트 정원 {capacity}명을 초과하는 팀은 지원할 수 없습니다.</span>
              </label>
            ) : null}

            <section aria-labelledby={`${titleId}-questions`} className="grid gap-5 border-t border-[var(--line)] pt-7">
              <div>
                <h3 id={`${titleId}-questions`} className="text-lg font-black">지원 질문</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">교수가 지정한 질문에 맞춰 작성해 주세요.</p>
              </div>
              {applicationQuestions.map((question) => <ApplicationAnswerField key={question.id} question={question} />)}
            </section>

            {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]">{state.message}</p> : null}

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-6 sm:flex-row sm:justify-between">
              <button type="button" onClick={closeDialog} disabled={pending} className="button-quiet">작성 취소</button>
              <button type="submit" disabled={pending || (kind === "TEAM" && leaderTeams.length === 0)} className="button-primary">{pending ? "처리 중" : kind === "TEAM" ? "팀으로 지원하기" : "지원서 제출"}</button>
            </div>
          </form>
        </div>
        <button type="button" onClick={closeDialog} disabled={pending} aria-label="지원서 닫기" className="button-quiet absolute right-4 top-4 min-w-11 px-0">
          <CloseIcon />
        </button>
      </dialog>

      {state.status === "success" ? (
        <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6">
          {state.message}
        </div>
      ) : null}
    </>
  );
}
