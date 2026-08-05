"use client";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState, useEffect, useRef } from "react";

import { createMilestoneAction, updateMilestoneStatusAction } from "@/app/teams/[teamId]/_actions/team-workspace-actions";
import { initialTeamActionState } from "@/app/teams/[teamId]/_lib/team-form-state";
import type { MilestoneStatus } from "@/modules/team/application/team-workspace-ports";
import { CustomMultiSelect, CustomSelect } from "@/shared/ui/custom-select";

type AssignableMember = { id: string; name: string };

export function MilestoneForm({ teamId, members }: { teamId: string; members: AssignableMember[] }) {
  const [state, action, pending] = useActionState(createMilestoneAction, initialTeamActionState);

  return (
    <form action={action} className="grid gap-3 border-y border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-5 lg:grid-cols-[minmax(0,1fr)_12rem_11rem_auto] lg:items-end">
      <input type="hidden" name="teamId" value={teamId} />
      <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted)]"><UiText>{"마일스톤 제목"}</UiText><UiInput name="title" required maxLength={200} placeholder="예: 사용자 인터뷰 완료" className="field text-[var(--ink)]" /></label>
      <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted)]"><UiText>{"담당자"}</UiText><CustomMultiSelect
          name="assigneeIds"
          options={members.map((member) => ({ value: member.id, label: member.name }))}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-semibold text-[var(--muted)]"><UiText>{"완료 예정일"}</UiText><input name="dueAt" type="date" required className="field text-[var(--ink)]" /></label>
      <button disabled={pending} className="button-primary"><UiText>{pending ? "추가 중" : "마일스톤 추가"}</UiText></button>
      {state.message ? <p aria-live="polite" className={`lg:col-span-4 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
    </form>
  );
}

export function MilestoneStatusForm({ teamId, milestoneId, status, assigneeIds, members }: {
  teamId: string;
  milestoneId: string;
  status: MilestoneStatus;
  assigneeIds: string[];
  members: AssignableMember[];
}) {
  const [state, action, pending] = useActionState(updateMilestoneStatusAction, initialTeamActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }, []);

  function scheduleAutosave() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 250);
  }

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2" aria-busy={pending}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <label className="grid gap-1 text-[0.6875rem] font-semibold text-[var(--muted)]"><UiText>{"담당자"}</UiText><CustomMultiSelect
          name="assigneeIds"
          defaultValues={assigneeIds}
          options={members.map((member) => ({ value: member.id, label: member.name }))}
          className="min-w-44 text-sm"
          disabled={pending}
          onValuesChange={scheduleAutosave}
        />
      </label>
      <label className="grid gap-1 text-[0.6875rem] font-semibold text-[var(--muted)]"><UiText>{"상태"}</UiText><CustomSelect
          name="status"
          defaultValue={status}
          options={[
            { value: "TODO", label: "할 일" },
            { value: "IN_PROGRESS", label: "진행 중" },
            { value: "DONE", label: "완료" },
          ]}
          className="min-w-28 text-sm"
          disabled={pending}
          onValueChange={scheduleAutosave}
        />
      </label>
      {state.status === "error" ? <span role="alert" className="text-xs text-[var(--danger)]"><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}
