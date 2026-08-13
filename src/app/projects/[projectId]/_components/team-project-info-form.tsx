"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef } from "react";

import {
  updateTeamProjectInfoAction,
  type TeamProjectInfoActionState,
} from "@/app/projects/[projectId]/_actions/team-project-info-actions";
import { UiButton, UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { IconButton } from "@/shared/ui/icon-button";
import { SuccessToast } from "@/shared/ui/success-toast";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";
import { CloseIcon, EditIcon } from "@/shared/ui/workspace-icons";

const initialState: TeamProjectInfoActionState = { status: "idle", message: "" };

function TeamProjectInfoFields({ title, description, pending }: {
  title: string;
  description: string;
  pending: boolean;
}) {
  return (
    <>
      <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
        <span><UiText>{"프로젝트명"}</UiText></span>
        <UiInput name="title" className="form-control bg-[var(--surface)]" defaultValue={title} maxLength={200} required disabled={pending} />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
        <span><UiText>{"프로젝트 설명"}</UiText></span>
        <UiTextarea name="description" className="form-control min-h-40 resize-y bg-[var(--surface)] leading-7" defaultValue={description} maxLength={8_000} required disabled={pending} />
      </label>
    </>
  );
}

export function TeamProjectInfoEditDialog({
  teamId,
  programName,
  title,
  description,
  disabled = false,
}: {
  teamId: string;
  programName: string;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(updateTeamProjectInfoAction, initialState);
  const toastMessage = useDialogSuccessToast(state, dialogRef);
  const disabledReason = disabled ? "팀장만 수정할 수 있습니다" : "프로젝트 정보 수정";

  return (
    <>
      <IconButton
        type="button"
        aria-label="프로젝트 정보 수정"
        title={disabledReason}
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
      >
        <EditIcon className="size-5" />
      </IconButton>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => { if (pending) event.preventDefault(); }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]"
      >
        <header className="flex items-start justify-between gap-5 border-b border-[var(--line)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="eyebrow truncate"><UiText>{programName}</UiText></p>
            <h2 id={titleId} className="mt-1.5 text-xl font-bold tracking-[-0.03em]"><UiText>{"프로젝트 정보 수정"}</UiText></h2>
            <p className="muted mt-1.5 text-sm"><UiText>{"프로젝트명과 설명을 수정합니다."}</UiText></p>
          </div>
          <UiButton type="button" onClick={() => dialogRef.current?.close()} disabled={pending} aria-label="프로젝트 정보 수정 닫기" className="button-quiet min-w-11 shrink-0 px-0"><CloseIcon className="size-5" /></UiButton>
        </header>
        <form action={action}>
          <input type="hidden" name="teamId" value={teamId} />
          <div className="grid grid-cols-1 gap-5 px-5 py-5 sm:px-6 sm:py-6">
            <TeamProjectInfoFields title={title} description={description} pending={pending} />
            {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={() => dialogRef.current?.close()} disabled={pending} className="button-quiet"><UiText>{"취소"}</UiText></button>
            <button type="submit" disabled={pending} className="button-primary"><UiText>{pending ? "저장 중" : "변경 저장"}</UiText></button>
          </div>
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}

export function TeamProjectInfoForm({
  teamId,
  projectId,
  title,
  description,
}: {
  teamId: string;
  projectId: string;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateTeamProjectInfoAction, initialState);

  useEffect(() => {
    if (state.status === "success") router.replace(`/projects/${projectId}`);
  }, [projectId, router, state.status]);

  return (
    <form action={action} className="panel overflow-hidden">
      <input type="hidden" name="teamId" value={teamId} />
      <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8">
        <TeamProjectInfoFields title={title} description={description} pending={pending} />
        {state.message ? (
          <p
            role={state.status === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
          >
            <UiText>{state.message}</UiText>
          </p>
        ) : null}
      </div>
      <div className="flex justify-end border-t border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-8">
        <button className="button-primary max-sm:w-full" type="submit" disabled={pending}>
          <UiText>{pending ? "저장 중" : "변경 저장"}</UiText>
        </button>
      </div>
    </form>
  );
}
