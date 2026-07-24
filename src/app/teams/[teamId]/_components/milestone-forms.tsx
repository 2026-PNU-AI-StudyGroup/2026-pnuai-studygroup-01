"use client";

import { useActionState } from "react";

import { createMilestoneAction, updateMilestoneStatusAction } from "@/app/teams/[teamId]/_actions/team-workspace-actions";
import { initialTeamActionState } from "@/app/teams/[teamId]/_lib/team-form-state";
import type { MilestoneStatus } from "@/modules/team/application/team-workspace-ports";

export function MilestoneForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(createMilestoneAction, initialTeamActionState);

  return (
    <form action={action} className="grid gap-3 border-y border-[var(--line)] py-5 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
      <input type="hidden" name="teamId" value={teamId} />
      <input name="title" aria-label="마일스톤 제목" required maxLength={200} placeholder="마일스톤 제목" className="field" />
      <input name="dueAt" aria-label="완료 예정일" type="date" required className="field" />
      <button disabled={pending} className="button-primary">{pending ? "추가 중" : "마일스톤 추가"}</button>
      {state.message ? <p aria-live="polite" className={`sm:col-span-3 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
    </form>
  );
}

export function MilestoneStatusForm({ teamId, milestoneId, status }: {
  teamId: string;
  milestoneId: string;
  status: MilestoneStatus;
}) {
  const [state, action, pending] = useActionState(updateMilestoneStatusAction, initialTeamActionState);

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
