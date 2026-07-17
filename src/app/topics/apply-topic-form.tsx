"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import {
  applyTopicAction,
  type ApplyTopicActionState,
} from "@/app/topics/actions";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";

const initialState: ApplyTopicActionState = { status: "idle", message: "" };
const TOAST_DURATION_MS = 3_000;

export function ApplyTopicForm({ topicId, topicTitle, profile }: {
  topicId: string;
  topicTitle: string;
  profile: StudentProfile | null;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
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
        className="button-primary"
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
            <p className="eyebrow">주제 지원</p>
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
          <label className="grid gap-2 text-sm font-semibold">
            보유 기술
            <input name="skills" maxLength={1000} required defaultValue={profile?.skills.join(", ")} className="field" placeholder="예: TypeScript, Python" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            희망 역할
            <input name="desiredRole" maxLength={500} required defaultValue={profile?.desiredRole} className="field" placeholder="예: 프론트엔드 개발" />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            활동 가능 시간
            <input name="availability" maxLength={500} required defaultValue={profile?.availability} className="field" placeholder="예: 평일 18시 이후" />
          </label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">
            지원 메시지
            <textarea
              name="message"
              maxLength={2000}
              required
              rows={5}
              className="field"
              placeholder="관심 분야와 참여 동기를 작성해 주세요."
            />
          </label>
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
              {pending ? "지원 중" : "지원서 제출"}
            </button>
          </div>
        </form>
      </dialog>

      {state.status === "success" ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--accent)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6"
        >
          {state.message}
        </div>
      ) : null}
    </>
  );
}
