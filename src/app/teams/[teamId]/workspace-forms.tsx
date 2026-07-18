"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import {
  closeTeamAction,
  createDiscussionPostAction,
  createMilestoneAction,
  createProgressUpdateAction,
  type TeamActionState,
  updateMilestoneStatusAction,
} from "@/app/teams/[teamId]/actions";
import type { MilestoneStatus } from "@/modules/team/application/team-workspace-ports";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: TeamActionState = { status: "idle", message: "" };

export function CloseTeamForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(closeTeamAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <ConfirmSubmitButton disabled={pending} className="button-danger" confirmMessage="팀을 종료하면 진행 기록과 보고서를 더 이상 수정할 수 없습니다. 승인된 최종 보고서를 확인하고 종료하시겠습니까?">{pending ? "종료 중" : "팀 종료"}</ConfirmSubmitButton>
      {state.status === "error" ? <span role="alert" className="text-xs text-[var(--danger)]">{state.message}</span> : null}
    </form>
  );
}

export function MilestoneForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(createMilestoneAction, initialState);
  return (
    <form action={action} className="grid gap-3 border-y border-[var(--line)] py-5 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
      <input type="hidden" name="teamId" value={teamId} />
      <input name="title" aria-label="마일스톤 제목" required maxLength={200} placeholder="마일스톤 제목" className="field" />
      <input name="dueAt" aria-label="완료 예정일" type="date" required className="field" />
      <button disabled={pending} className="button-primary">
        {pending ? "추가 중" : "마일스톤 추가"}
      </button>
      {state.message ? <p aria-live="polite" className={`sm:col-span-3 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
    </form>
  );
}

export function MilestoneStatusForm({ teamId, milestoneId, status }: { teamId: string; milestoneId: string; status: MilestoneStatus }) {
  const [state, action, pending] = useActionState(updateMilestoneStatusAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <select name="status" aria-label="마일스톤 상태" defaultValue={status} className="field text-sm">
        <option value="TODO">할 일</option>
        <option value="IN_PROGRESS">진행 중</option>
        <option value="DONE">완료</option>
      </select>
      <button disabled={pending} className="button-quiet px-2 text-sm">저장</button>
      {state.status === "error" ? <span role="alert" className="text-xs text-[var(--danger)]">{state.message}</span> : null}
    </form>
  );
}

export function ProgressUpdateForm({ teamId }: { teamId: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(createProgressUpdateAction, initialState);
  const [dismissedSuccess, setDismissedSuccess] = useState<TeamActionState | null>(null);
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
      <button type="button" className="button-primary" onClick={() => dialogRef.current?.showModal()}>진행 기록 추가</button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]">
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

export function DiscussionPostForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(createDiscussionPostAction, initialState);
  return (
    <form action={action} className="grid gap-3 border-y border-[var(--line)] py-5">
      <input type="hidden" name="teamId" value={teamId} />
      <textarea name="content" aria-label="토론 내용" required maxLength={2000} rows={3} placeholder="팀에 질문이나 의견을 남기세요" className="field" />
      <button disabled={pending} className="button-primary justify-self-start">{pending ? "등록 중" : "의견 남기기"}</button>
      {state.message ? <p aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>{state.message}</p> : null}
    </form>
  );
}
