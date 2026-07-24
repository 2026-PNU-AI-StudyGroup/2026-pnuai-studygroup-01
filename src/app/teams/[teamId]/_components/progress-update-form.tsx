"use client";

import { useActionState, useId, useRef } from "react";

import { createProgressUpdateAction } from "@/app/teams/[teamId]/_actions/team-workspace-actions";
import { initialTeamActionState } from "@/app/teams/[teamId]/_lib/team-form-state";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";

export function ProgressUpdateForm({ teamId }: { teamId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(createProgressUpdateAction, initialTeamActionState);
  const toastMessage = useDialogSuccessToast(state, dialogRef);

  return (
    <>
      <button type="button" className="button-primary" onClick={() => dialogRef.current?.showModal()}>진행 기록 추가</button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]">
        <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7"><div><p className="eyebrow">수행 과정</p><h3 id={titleId} className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">진행 기록 추가</h3><p className="muted mt-2 text-sm">완료한 내용과 위험 요소, 다음 행동을 한 기록으로 남깁니다.</p></div><button type="button" aria-label="진행 기록 닫기" disabled={pending} onClick={() => dialogRef.current?.close()} className="button-quiet min-w-11 shrink-0 px-0 text-xl">×</button></div>
        <form action={action} className="grid gap-5 px-5 py-6 sm:px-7">
          <input type="hidden" name="teamId" value={teamId} />
          <label className="grid gap-2 text-sm font-semibold">진행 내용<textarea name="content" required maxLength={5000} rows={5} placeholder="이번 주에 완료한 내용을 기록하세요." className="field" /></label>
          <label className="grid gap-2 text-sm font-semibold">위험 요소 <span className="muted font-normal">선택 입력</span><textarea name="risk" maxLength={2000} rows={3} placeholder="일정이나 구현을 막을 수 있는 문제가 있다면 적어 주세요." className="field" /></label>
          <label className="grid gap-2 text-sm font-semibold">다음 행동 <span className="muted font-normal">선택 입력</span><textarea name="nextAction" maxLength={2000} rows={3} placeholder="다음 기록 전까지 진행할 행동을 적어 주세요." className="field" /></label>
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]">{state.message}</p> : null}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end"><button type="button" className="button-quiet" disabled={pending} onClick={() => dialogRef.current?.close()}>취소</button><button className="button-primary" disabled={pending}>{pending ? "기록 중" : "진행 기록 저장"}</button></div>
        </form>
      </dialog>
      {toastMessage ? <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6">{toastMessage}</div> : null}
    </>
  );
}
