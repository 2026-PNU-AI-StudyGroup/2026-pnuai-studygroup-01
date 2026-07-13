"use client";

import { useActionState } from "react";

import {
  createMilestoneAction,
  createProgressUpdateAction,
  type TeamActionState,
  updateMilestoneStatusAction,
} from "@/app/teams/[teamId]/actions";
import type { MilestoneStatus } from "@/modules/team/application/team-workspace-ports";

const initialState: TeamActionState = { status: "idle", message: "" };

export function MilestoneForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(createMilestoneAction, initialState);
  return (
    <form action={action} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
      <input type="hidden" name="teamId" value={teamId} />
      <input name="title" required maxLength={200} placeholder="마일스톤 제목" className="rounded-lg border px-3 py-2" />
      <input name="dueAt" type="date" required className="rounded-lg border px-3 py-2" />
      <button disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
        {pending ? "추가 중" : "마일스톤 추가"}
      </button>
      {state.message ? <p aria-live="polite" className={`sm:col-span-3 ${state.status === "error" ? "text-red-700" : "text-green-700"}`}>{state.message}</p> : null}
    </form>
  );
}

export function MilestoneStatusForm({ teamId, milestoneId, status }: { teamId: string; milestoneId: string; status: MilestoneStatus }) {
  const [state, action, pending] = useActionState(updateMilestoneStatusAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <select name="status" defaultValue={status} className="rounded-lg border px-2 py-1 text-sm">
        <option value="TODO">할 일</option>
        <option value="IN_PROGRESS">진행 중</option>
        <option value="DONE">완료</option>
      </select>
      <button disabled={pending} className="text-sm font-semibold text-blue-700">저장</button>
      {state.status === "error" ? <span className="text-xs text-red-700">{state.message}</span> : null}
    </form>
  );
}

export function ProgressUpdateForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(createProgressUpdateAction, initialState);
  return (
    <form action={action} className="grid gap-3 rounded-xl border p-4">
      <input type="hidden" name="teamId" value={teamId} />
      <textarea name="content" required maxLength={5000} rows={4} placeholder="진행 내용" className="rounded-lg border px-3 py-2" />
      <textarea name="risk" maxLength={2000} rows={2} placeholder="위험 요소 (선택)" className="rounded-lg border px-3 py-2" />
      <textarea name="nextAction" maxLength={2000} rows={2} placeholder="다음 행동 (선택)" className="rounded-lg border px-3 py-2" />
      <button disabled={pending} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
        {pending ? "기록 중" : "진행 기록 추가"}
      </button>
      {state.message ? <p aria-live="polite" className={state.status === "error" ? "text-red-700" : "text-green-700"}>{state.message}</p> : null}
    </form>
  );
}
