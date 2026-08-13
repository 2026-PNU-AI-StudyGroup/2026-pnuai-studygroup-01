"use client";

import { useActionState, useId, useRef } from "react";

import {
  completeTaskAction,
  createTaskAction,
  deleteTaskAction,
  reopenTaskAction,
  updateTaskAction,
} from "@/app/projects/[projectId]/_actions/team-workspace-actions";
import {
  reportDialogClassName,
  ReportFormActions,
  ReportFormDialogHeader,
} from "@/app/projects/[projectId]/_components/report-form-layout";
import { initialTeamActionState } from "@/app/projects/[projectId]/_lib/team-form-state";
import type { TaskStatus } from "@/modules/team/application/team-workspace-ports";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { CustomMultiSelect, CustomSelect } from "@/shared/ui/custom-select";
import { DateTimeInput } from "@/shared/ui/form-system";
import { IconButton } from "@/shared/ui/icon-button";
import { SuccessToast } from "@/shared/ui/success-toast";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";
import { AddIcon, CheckIcon, EditIcon, UndoIcon } from "@/shared/ui/workspace-icons";

type AssignableMember = { id: string; name: string };

const taskStatusOptions = [
  { value: "TODO", label: "할 일" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "DONE", label: "완료" },
];

function TaskFields({
  members,
  pending,
  title,
  dueAt,
  status,
  assigneeIds,
}: {
  members: AssignableMember[];
  pending: boolean;
  title?: string;
  dueAt?: Date;
  status?: TaskStatus;
  assigneeIds?: string[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-bold text-[var(--muted)] sm:col-span-2">
        <UiText>{"할 일 제목"}</UiText>
        <UiInput name="title" required maxLength={200} defaultValue={title} disabled={pending} placeholder="예: 사용자 인터뷰 완료" className="form-control text-[var(--ink)]" />
      </label>
      <label className="grid gap-1.5 text-sm font-bold text-[var(--muted)]">
        <UiText>{"담당자"}</UiText>
        <CustomMultiSelect
          name="assigneeIds"
          defaultValues={assigneeIds}
          options={members.map((member) => ({ value: member.id, label: member.name }))}
          disabled={pending}
        />
      </label>
      {status ? (
        <label className="grid gap-1.5 text-sm font-bold text-[var(--muted)]">
          <UiText>{"상태"}</UiText>
          <CustomSelect
            name="status"
            ariaLabel="상태"
            defaultValue={status}
            options={taskStatusOptions}
            disabled={pending}
          />
        </label>
      ) : null}
      <label className={`grid gap-1.5 text-sm font-bold text-[var(--muted)] ${status ? "sm:col-span-2" : ""}`}>
        <UiText>{"완료 예정일"}</UiText>
        <DateTimeInput name="dueAt" type="date" required defaultValue={dueAt?.toISOString().slice(0, 10)} disabled={pending} className="text-[var(--ink)]" />
      </label>
    </div>
  );
}

export function TaskCreateDialog({ teamId, members }: { teamId: string; members: AssignableMember[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(createTaskAction, initialTeamActionState);
  const toastMessage = useDialogSuccessToast(state, dialogRef);

  return (
    <>
      <button type="button" className="button-primary gap-2" onClick={() => dialogRef.current?.showModal()}>
        <AddIcon className="size-4 shrink-0" /><UiText>{"새 할 일"}</UiText>
      </button>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className={`${reportDialogClassName} max-w-2xl`}>
        <ReportFormDialogHeader title="새 할 일" description="내용과 담당자를 정한 뒤 한 번에 추가합니다." titleId={titleId} closeLabel="할 일 추가 닫기" pending={pending} onClose={() => dialogRef.current?.close()} />
        <form action={action} className="grid gap-5 px-5 py-6 sm:px-7">
          <input type="hidden" name="teamId" value={teamId} />
          <TaskFields members={members} pending={pending} />
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
          <ReportFormActions pending={pending} pendingLabel="추가 중" submitLabel="할 일 추가" onCancel={() => dialogRef.current?.close()} />
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}

export function TaskEditDialog({
  teamId,
  taskId,
  title,
  dueAt,
  status,
  assigneeIds,
  members,
}: {
  teamId: string;
  taskId: string;
  title: string;
  dueAt: Date;
  status: TaskStatus;
  assigneeIds: string[];
  members: AssignableMember[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(updateTaskAction, initialTeamActionState);
  const toastMessage = useDialogSuccessToast(state, dialogRef);

  return (
    <>
      <IconButton type="button" onClick={() => dialogRef.current?.showModal()} aria-label={`${title} 수정`} title="할 일 수정"><EditIcon className="size-5" /></IconButton>
      <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className={`${reportDialogClassName} max-w-2xl`}>
        <ReportFormDialogHeader title="할 일 수정" description="제목, 기한, 담당자와 상태를 한 번에 저장합니다." titleId={titleId} closeLabel="할 일 수정 닫기" pending={pending} onClose={() => dialogRef.current?.close()} />
        <form action={action} className="grid gap-5 px-5 py-6 sm:px-7">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="taskId" value={taskId} />
          <TaskFields members={members} pending={pending} title={title} dueAt={dueAt} status={status} assigneeIds={assigneeIds} />
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
          <ReportFormActions pending={pending} pendingLabel="저장 중" submitLabel="변경 저장" onCancel={() => dialogRef.current?.close()} />
        </form>
        <TaskDeleteForm teamId={teamId} taskId={taskId} title={title} />
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}

export function TaskCompletionForm({
  teamId,
  taskId,
  title,
  status,
}: {
  teamId: string;
  taskId: string;
  title: string;
  status: TaskStatus;
}) {
  const completed = status === "DONE";
  const [state, action, pending] = useActionState(
    completed ? reopenTaskAction : completeTaskAction,
    initialTeamActionState,
  );
  const actionLabel = completed ? "할 일로 되돌리기" : "완료 처리";

  return (
    <form action={action}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="taskId" value={taskId} />
      <IconButton
        type="submit"
        disabled={pending}
        aria-label={`${title} ${actionLabel}`}
        title={actionLabel}
      >
        {completed ? <UndoIcon className="size-5" /> : <CheckIcon className="size-5" />}
      </IconButton>
      {state.status === "error" ? <span className="sr-only" role="alert"><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}

function TaskDeleteForm({ teamId, taskId, title }: { teamId: string; taskId: string; title: string }) {
  const [state, action, pending] = useActionState(deleteTaskAction, initialTeamActionState);

  return (
    <form action={action} className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-5 sm:px-7">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="taskId" value={taskId} />
      {state.status === "error" ? <span role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></span> : <span className="text-sm text-[var(--muted)]"><UiText>{"삭제한 할 일은 복구할 수 없습니다."}</UiText></span>}
      <ConfirmSubmitButton className="button-quiet text-[var(--danger)]" disabled={pending} confirmMessage={`‘${title}’ 할 일을 삭제하시겠습니까?`}>
        <UiText>{pending ? "삭제 중" : "할 일 삭제"}</UiText>
      </ConfirmSubmitButton>
    </form>
  );
}
