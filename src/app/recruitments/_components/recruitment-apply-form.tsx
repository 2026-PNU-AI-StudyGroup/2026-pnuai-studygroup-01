"use client";

import { UiButton, UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState, useId, useRef } from "react";

import { applyRecruitmentAction } from "@/app/_actions/recruitment-actions";
import { initialRecruitmentActionState } from "@/app/_lib/recruitment-form-state";
import { SuccessToast } from "@/shared/ui/success-toast";
import { useDialogSuccessToast } from "@/shared/ui/use-dialog-success-toast";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
import { ChoiceCard } from "@/shared/ui/form-system";

const contactLabels = { phone: "전화번호", kakao: "카카오톡", github: "GitHub", instagram: "Instagram" } as const;

export function RecruitmentApplyForm({
  postId,
  postTitle,
  teamName,
  contactOptions,
}: {
  postId: string;
  postTitle: string;
  teamName: string;
  contactOptions: StudentProfile | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [state, action, pending] = useActionState(
    applyRecruitmentAction,
    initialRecruitmentActionState,
  );
  const toastMessage = useDialogSuccessToast(state, dialogRef);
  const contacts = (Object.entries(contactOptions ?? {}) as Array<[keyof typeof contactLabels, string]>).filter(([, value]) => Boolean(value));

  return (
    <>
      {/* 목록 줄 안의 버튼이라 내용 크기의 낮은 테두리 버튼으로 둔다. */}
      <button type="button" className="button-secondary button-compact min-h-8 px-3 font-medium" onClick={() => dialogRef.current?.showModal()}>
        <UiText>{"지원하기"}</UiText>
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => { if (pending) event.preventDefault(); }}
        className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[var(--backdrop)]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[0.8125rem] text-[var(--muted)]">{teamName}</p>
            <h3 id={titleId} className="mt-0.5 text-lg font-semibold leading-6"><UiText>{postTitle}</UiText> {" "}<UiText>{"지원"}</UiText></h3>
            <p id={descriptionId} className="mt-1 text-sm text-[var(--muted)]"><UiText>{"희망 역할과 지원 내용을 입력해 주세요."}</UiText></p>
          </div>
          <UiButton type="button" aria-label="팀원 모집 지원 닫기" disabled={pending} onClick={() => dialogRef.current?.close()} className="button-quiet min-w-11 shrink-0 px-0">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.75]" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </UiButton>
        </div>
        <form action={action} className="grid gap-4 px-5 py-5 sm:px-6">
          <input type="hidden" name="postId" value={postId} />
          <label className="grid gap-2 text-sm font-medium"><UiText>{"희망 역할"}</UiText><UiInput name="desiredRole" required className="form-control" placeholder="팀에서 맡고 싶은 역할" /></label>
          <label className="grid gap-2 text-sm font-medium"><UiText>{"지원 내용"}</UiText><UiTextarea aria-label="지원 내용" name="message" maxLength={2000} rows={6} required className="form-control resize-y" placeholder="관련 경험과 지원 동기를 구체적으로 작성해 주세요" /><span className="text-xs font-normal text-[var(--muted)]"><UiText>{"최대 2,000자"}</UiText></span></label>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium"><UiText>{"공유할 연락처"}</UiText></legend>
            <p className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"선택한 연락처만 팀장에게 전달됩니다."}</UiText></p>
            {contacts.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {contacts.map(([kind, value]) => (
                  <ChoiceCard key={kind} type="checkbox" name="sharedContactKinds" value={kind} label={contactLabels[kind]} description={value} density="compact" />
                ))}
              </div>
            ) : <p className="text-sm text-[var(--muted)]"><UiText>{"내 계정에 등록한 연락처가 없습니다. 연락처 없이 지원할 수 있습니다."}</UiText></p>}
          </fieldset>
          {state.status === "error" ? <p role="alert" className="text-sm font-medium text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-3 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" className="button-secondary button-compact" disabled={pending} onClick={() => dialogRef.current?.close()}><UiText>{"취소"}</UiText></button>
            <button className="button-primary button-compact" disabled={pending}><UiText>{pending ? "지원 중" : "지원하기"}</UiText></button>
          </div>
        </form>
      </dialog>
      <SuccessToast message={toastMessage} />
    </>
  );
}
