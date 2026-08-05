"use client";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState, useEffect, useRef, useState } from "react";

import { createMilestoneAction, type TeamActionState, updateMilestoneStatusAction } from "@/app/teams/[teamId]/_actions/team-workspace-actions";
import { initialTeamActionState } from "@/app/teams/[teamId]/_lib/team-form-state";
import type { MilestoneStatus } from "@/modules/team/application/team-workspace-ports";
import { CustomMultiSelect, CustomSelect } from "@/shared/ui/custom-select";

type AssignableMember = { id: string; name: string };
type MilestoneDraft = { status: MilestoneStatus; assigneeIds: string[] };

function milestoneDraft(status: MilestoneStatus, assigneeIds: string[]): MilestoneDraft {
  return { status, assigneeIds: [...new Set(assigneeIds)] };
}

function isMilestoneStatus(value: string): value is MilestoneStatus {
  return value === "TODO" || value === "IN_PROGRESS" || value === "DONE";
}

export function MilestoneForm({ teamId, members }: { teamId: string; members: AssignableMember[] }) {
  const [state, action, pending] = useActionState(createMilestoneAction, initialTeamActionState);

  return (
    <form action={action} aria-labelledby="new-milestone-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5 shadow-[0_10px_30px_rgba(31,35,48,0.055)] sm:p-6">
      <input type="hidden" name="teamId" value={teamId} />
      <header>
        <p className="eyebrow"><UiText>{"계획"}</UiText></p>
        <h2 id="new-milestone-title" className="mt-1 text-xl font-black tracking-[-0.035em]"><UiText>{"마일스톤 추가"}</UiText></h2>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--muted)]"><UiText>{"첫 목표와 완료 예정일, 담당자를 정해 주세요."}</UiText></p>
      </header>
      <div className="mt-5 grid gap-4 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_12rem_11rem_auto] 2xl:items-end">
        <label className="grid min-w-0 gap-1.5 text-xs font-bold text-[var(--muted)] xl:col-span-2 2xl:col-span-1"><UiText>{"마일스톤 제목"}</UiText><UiInput name="title" required maxLength={200} placeholder="예: 사용자 인터뷰 완료" className="field text-[var(--ink)]" /></label>
        <label className="grid min-w-0 gap-1.5 text-xs font-bold text-[var(--muted)]"><UiText>{"담당자"}</UiText><CustomMultiSelect
            name="assigneeIds"
            options={members.map((member) => ({ value: member.id, label: member.name }))}
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-bold text-[var(--muted)]"><UiText>{"완료 예정일"}</UiText><input name="dueAt" type="date" required className="field text-[var(--ink)]" /></label>
        <button disabled={pending} className="button-primary xl:col-span-2 xl:justify-self-end 2xl:col-span-1 2xl:justify-self-stretch"><UiText>{pending ? "추가 중" : "마일스톤 추가"}</UiText></button>
        {state.message ? <p aria-live="polite" className={`text-sm font-semibold xl:col-span-2 2xl:col-span-4 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
      </div>
    </form>
  );
}

type MilestoneStatusFormProps = {
  teamId: string;
  milestoneId: string;
  status: MilestoneStatus;
  assigneeIds: string[];
  members: AssignableMember[];
};

export function MilestoneStatusForm(props: MilestoneStatusFormProps) {
  return <MilestoneStatusFields key={JSON.stringify([props.status, props.assigneeIds])} {...props} />;
}

function MilestoneStatusFields({ teamId, milestoneId, status, assigneeIds, members }: MilestoneStatusFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState<MilestoneDraft>(() => milestoneDraft(status, assigneeIds));
  const draftRef = useRef(draft);
  const committedRef = useRef(draft);
  const submittedRef = useRef<MilestoneDraft | null>(null);
  const [state, action, pending] = useActionState(async (previousState: TeamActionState, formData: FormData) => {
    const result = await updateMilestoneStatusAction(previousState, formData);
    if (result.status === "success" && submittedRef.current) {
      committedRef.current = submittedRef.current;
      submittedRef.current = null;
      return result;
    }
    if (result.status !== "error") return result;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
    submittedRef.current = null;
    const rollback = milestoneDraft(committedRef.current.status, committedRef.current.assigneeIds);
    draftRef.current = rollback;
    setDraft(rollback);
    return result;
  }, initialTeamActionState);

  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }, []);

  function updateDraft(nextDraft: MilestoneDraft) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }

  function scheduleAutosave() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      submittedRef.current = milestoneDraft(draftRef.current.status, draftRef.current.assigneeIds);
      formRef.current?.requestSubmit();
    }, 250);
  }

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2 sm:items-end" aria-busy={pending}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="milestoneId" value={milestoneId} />
      <label className="grid min-w-0 gap-1 text-[0.6875rem] font-bold text-[var(--muted)]"><UiText>{"담당자"}</UiText><CustomMultiSelect
          name="assigneeIds"
          values={draft.assigneeIds}
          options={members.map((member) => ({ value: member.id, label: member.name }))}
          className="text-sm"
          disabled={pending}
          onValuesChange={(nextAssigneeIds) => {
            updateDraft(milestoneDraft(draftRef.current.status, nextAssigneeIds));
            scheduleAutosave();
          }}
        />
      </label>
      <label className="grid min-w-0 gap-1 text-[0.6875rem] font-bold text-[var(--muted)]"><UiText>{"상태"}</UiText><CustomSelect
          name="status"
          ariaLabel="상태"
          value={draft.status}
          options={[
            { value: "TODO", label: "할 일" },
            { value: "IN_PROGRESS", label: "진행 중" },
            { value: "DONE", label: "완료" },
          ]}
          className="text-sm"
          disabled={pending}
          onValueChange={(nextStatus) => {
            if (!isMilestoneStatus(nextStatus)) return;
            updateDraft(milestoneDraft(nextStatus, draftRef.current.assigneeIds));
            scheduleAutosave();
          }}
        />
      </label>
      {state.status === "error" ? <span role="alert" className="text-xs font-semibold text-[var(--danger)] sm:col-span-2"><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}
