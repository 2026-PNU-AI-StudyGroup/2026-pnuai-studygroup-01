"use client";

import { UiButton, UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState, useId, useRef } from "react";

import { applyRecruitmentAction } from "@/app/recruitments/_actions/recruitment-actions";
import { initialRecruitmentActionState } from "@/app/recruitments/_lib/recruitment-form-state";
import { SuccessToast } from "@/shared/ui/success-toast";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";

export function RecruitmentApplyForm({
  postId,
  postTitle,
  teamName,
}: {
  postId: string;
  postTitle: string;
  teamName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [state, action, pending] = useActionState(
    applyRecruitmentAction,
    initialRecruitmentActionState,
  );
  const toastMessage = useDialogSuccessToast(state, dialogRef);

  return (
    <>
      <button type="button" className="button-primary w-full gap-2" onClick={() => dialogRef.current?.showModal()}>
        <UiText>{"지원하기"}</UiText><svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-[1.75]" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9.5 5 7 7-7 7" />
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { if (pending) event.preventDefault(); }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-[var(--line)] bg-white px-5 py-5 sm:px-7">
          <div>
            <p className="text-sm font-bold text-[var(--primary)]">{teamName}</p>
            <h3 id={titleId} className="mt-1 text-2xl font-bold tracking-[-0.035em]"><UiText>{postTitle}</UiText> {" "}<UiText>{"지원"}</UiText></h3>
            <p id={descriptionId} className="muted mt-2 text-sm leading-6"><UiText>{"희망 역할과 지원 내용을 입력해 주세요."}</UiText></p>
          </div>
          <UiButton type="button" aria-label="팀원 모집 지원 닫기" disabled={pending} onClick={() => dialogRef.current?.close()} className="button-quiet min-w-11 shrink-0 px-0">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75]" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </UiButton>
        </div>
        <form action={action} className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
          <input type="hidden" name="postId" value={postId} />
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2"><UiText>{"희망 역할"}</UiText><UiInput name="desiredRole" required className="form-control" placeholder="팀에서 맡고 싶은 역할" /></label>
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2"><UiText>{"지원 내용"}</UiText><UiTextarea aria-label="지원 내용" name="message" maxLength={2000} rows={6} required className="form-control resize-y" placeholder="관련 경험과 지원 동기를 구체적으로 작성해 주세요" /><span className="muted text-xs font-normal"><UiText>{"최대 2,000자"}</UiText></span></label>
          {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)] sm:col-span-2"><UiText>{state.message}</UiText></p> : null}
          <div className="sticky bottom-0 -mx-5 -mb-6 flex flex-col-reverse gap-2 border-t border-[var(--line)] bg-white px-5 py-4 sm:col-span-2 sm:-mx-7 sm:flex-row sm:justify-end sm:px-7">
            <button type="button" className="button-quiet" disabled={pending} onClick={() => dialogRef.current?.close()}><UiText>{"취소"}</UiText></button>
            <button className="button-primary" disabled={pending}><UiText>{pending ? "지원 중" : "지원하기"}</UiText></button>
          </div>
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}
