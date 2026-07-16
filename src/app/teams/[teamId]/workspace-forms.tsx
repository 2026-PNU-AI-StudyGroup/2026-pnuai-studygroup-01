"use client";

import { useActionState } from "react";

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
    <form action={action} className="grid gap-3 rounded-xl bg-[var(--surface-subtle)] p-5 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
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
  const [state, action, pending] = useActionState(createProgressUpdateAction, initialState);
  return (
    <form action={action} className="grid gap-3 border-y border-[var(--line)] bg-[var(--surface)] py-5">
      <input type="hidden" name="teamId" value={teamId} />
      <textarea name="content" aria-label="진행 내용" required maxLength={5000} rows={4} placeholder="이번 주 진행 내용을 기록하세요" className="field" />
      <textarea name="risk" aria-label="위험 요소" maxLength={2000} rows={2} placeholder="위험 요소 (선택)" className="field" />
      <textarea name="nextAction" aria-label="다음 행동" maxLength={2000} rows={2} placeholder="다음 행동 (선택)" className="field" />
      <button disabled={pending} className="button-primary justify-self-start">
        {pending ? "기록 중" : "진행 기록 추가"}
      </button>
      {state.message ? <p aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>{state.message}</p> : null}
    </form>
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
