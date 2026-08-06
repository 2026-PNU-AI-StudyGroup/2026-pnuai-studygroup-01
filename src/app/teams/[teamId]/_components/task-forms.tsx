"use client";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  createTaskAction,
  deleteTaskAction,
  type TeamActionState,
  updateTaskDetailsAction,
  updateTaskStatusAction,
} from "@/app/teams/[teamId]/_actions/team-workspace-actions";
import { initialTeamActionState } from "@/app/teams/[teamId]/_lib/team-form-state";
import type { TaskStatus } from "@/modules/team/application/team-workspace-ports";
import { CustomMultiSelect, CustomSelect } from "@/shared/ui/custom-select";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

type AssignableMember = { id: string; name: string };
type TaskDraft = { status: TaskStatus; assigneeIds: string[] };

function taskDraft(status: TaskStatus, assigneeIds: string[]): TaskDraft {
  return { status, assigneeIds: [...new Set(assigneeIds)] };
}

function isTaskStatus(value: string): value is TaskStatus {
  return value === "TODO" || value === "IN_PROGRESS" || value === "DONE";
}

export function TaskForm({ teamId, members }: { teamId: string; members: AssignableMember[] }) {
  const [state, action, pending] = useActionState(createTaskAction, initialTeamActionState);

  return (
    <form action={action} aria-labelledby="new-task-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5 shadow-[0_10px_30px_rgba(31,35,48,0.055)] sm:p-6">
      <input type="hidden" name="teamId" value={teamId} />
      <header>
        <h2 id="new-task-title" className="text-xl font-black tracking-[-0.035em]"><UiText>{"할 일 추가"}</UiText></h2>
      </header>
      <div className="mt-5 grid gap-4 xl:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_12rem_11rem_auto] 2xl:items-end">
        <label className="grid min-w-0 gap-1.5 text-xs font-bold text-[var(--muted)] xl:col-span-2 2xl:col-span-1"><UiText>{"할 일 제목"}</UiText><UiInput name="title" required maxLength={200} placeholder="예: 사용자 인터뷰 완료" className="field text-[var(--ink)]" /></label>
        <label className="grid min-w-0 gap-1.5 text-xs font-bold text-[var(--muted)]"><UiText>{"담당자"}</UiText><CustomMultiSelect
            name="assigneeIds"
            options={members.map((member) => ({ value: member.id, label: member.name }))}
          />
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-bold text-[var(--muted)]"><UiText>{"완료 예정일"}</UiText><input name="dueAt" type="date" required className="field text-[var(--ink)]" /></label>
        <button disabled={pending} className="button-primary xl:col-span-2 xl:justify-self-end 2xl:col-span-1 2xl:justify-self-stretch"><UiText>{pending ? "추가 중" : "할 일 추가"}</UiText></button>
        {state.message ? <p aria-live="polite" className={`text-sm font-semibold xl:col-span-2 2xl:col-span-4 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
      </div>
    </form>
  );
}

type TaskStatusFormProps = {
  teamId: string;
  taskId: string;
  status: TaskStatus;
  assigneeIds: string[];
  members: AssignableMember[];
};

export function TaskStatusForm(props: TaskStatusFormProps) {
  return <TaskStatusFields key={JSON.stringify([props.status, props.assigneeIds])} {...props} />;
}

export function TaskDetailsForm({
  teamId,
  taskId,
  title,
  dueAt,
}: {
  teamId: string;
  taskId: string;
  title: string;
  dueAt: Date;
}) {
  const [state, action, pending] = useActionState(updateTaskDetailsAction, initialTeamActionState);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="taskId" value={taskId} />
      <label className="grid min-w-0 gap-1 text-[0.6875rem] font-bold text-[var(--muted)]">
        <UiText>{"할 일 제목"}</UiText>
        <UiInput name="title" required maxLength={200} defaultValue={title} className="field text-sm text-[var(--ink)]" />
      </label>
      <label className="grid min-w-0 gap-1 text-[0.6875rem] font-bold text-[var(--muted)]">
        <UiText>{"완료 예정일"}</UiText>
        <input name="dueAt" type="date" required defaultValue={dueAt.toISOString().slice(0, 10)} className="field text-sm text-[var(--ink)]" />
      </label>
      <button className="button-secondary text-sm" disabled={pending}>
        <UiText>{pending ? "저장 중" : "변경 저장"}</UiText>
      </button>
      {state.message ? (
        <span aria-live="polite" className={`text-xs font-semibold sm:col-span-3 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </span>
      ) : null}
    </form>
  );
}

export function TaskDeleteForm({ teamId, taskId, title }: { teamId: string; taskId: string; title: string }) {
  const [state, action, pending] = useActionState(deleteTaskAction, initialTeamActionState);

  return (
    <form action={action} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="taskId" value={taskId} />
      {state.status === "error" ? <span role="alert" className="text-xs font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></span> : <span />}
      <ConfirmSubmitButton
        className="button-quiet text-[var(--danger)]"
        disabled={pending}
        confirmMessage={`‘${title}’ 할 일을 삭제하시겠습니까?`}
      >
        <UiText>{pending ? "삭제 중" : "할 일 삭제"}</UiText>
      </ConfirmSubmitButton>
    </form>
  );
}

function TaskStatusFields({ teamId, taskId, status, assigneeIds, members }: TaskStatusFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState<TaskDraft>(() => taskDraft(status, assigneeIds));
  const draftRef = useRef(draft);
  const committedRef = useRef(draft);
  const submittedRef = useRef<TaskDraft | null>(null);
  const [state, action, pending] = useActionState(async (previousState: TeamActionState, formData: FormData) => {
    const result = await updateTaskStatusAction(previousState, formData);
    if (result.status === "success" && submittedRef.current) {
      committedRef.current = submittedRef.current;
      submittedRef.current = null;
      return result;
    }
    if (result.status !== "error") return result;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
    submittedRef.current = null;
    const rollback = taskDraft(committedRef.current.status, committedRef.current.assigneeIds);
    draftRef.current = rollback;
    setDraft(rollback);
    return result;
  }, initialTeamActionState);

  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }, []);

  function updateDraft(nextDraft: TaskDraft) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }

  function scheduleAutosave() {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      submittedRef.current = taskDraft(draftRef.current.status, draftRef.current.assigneeIds);
      formRef.current?.requestSubmit();
    }, 250);
  }

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2 sm:items-end" aria-busy={pending}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="taskId" value={taskId} />
      <label className="grid min-w-0 gap-1 text-[0.6875rem] font-bold text-[var(--muted)]"><UiText>{"담당자"}</UiText><CustomMultiSelect
          name="assigneeIds"
          values={draft.assigneeIds}
          options={members.map((member) => ({ value: member.id, label: member.name }))}
          className="text-sm"
          disabled={pending}
          onValuesChange={(nextAssigneeIds) => {
            updateDraft(taskDraft(draftRef.current.status, nextAssigneeIds));
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
            if (!isTaskStatus(nextStatus)) return;
            updateDraft(taskDraft(nextStatus, draftRef.current.assigneeIds));
            scheduleAutosave();
          }}
        />
      </label>
      {state.status === "error" ? <span role="alert" className="text-xs font-semibold text-[var(--danger)] sm:col-span-2"><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}
