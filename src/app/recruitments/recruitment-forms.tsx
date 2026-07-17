"use client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { applyRecruitmentAction, createRecruitmentPostAction, decideRecruitmentAction, type RecruitmentActionState } from "@/app/recruitments/actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
const initial: RecruitmentActionState = { status: "idle", message: "" };

export function RecruitmentPostForm({ teams, successHref }: { teams: Array<{ id: string; name: string }>; successHref?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createRecruitmentPostAction, initial);
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);
  if (!teams.length) return null;
  return <form action={action} className="grid gap-5 sm:grid-cols-2">
    <label className="grid gap-2 text-sm font-medium">팀<select name="teamId" className="field">{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">제목<input name="title" maxLength={200} required className="field" /></label>
    <label className="grid gap-2 text-sm font-medium sm:col-span-2">모집 내용<textarea name="content" maxLength={2000} rows={4} required className="field" /></label>
    <label className="grid gap-2 text-sm font-medium">필요 기술<input name="requiredSkills" required className="field" placeholder="TypeScript, Python" /></label>
    <label className="grid gap-2 text-sm font-medium">필요 역할<input name="roleNeeded" maxLength={500} required className="field" /></label>
    <label className="grid gap-2 text-sm font-medium">활동 가능 시간<input name="availability" maxLength={500} required className="field" /></label>
    <button className="button-primary self-end" disabled={pending}>{pending ? "등록 중" : "모집 글 등록"}</button>
    {state.message ? <p aria-live="polite" className={`sm:col-span-2 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
  </form>;
}

export function RecruitmentApplyForm({ postId, postTitle, teamName, profile }: { postId: string; postTitle: string; teamName: string; profile: StudentProfile | null }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, action, pending] = useActionState(applyRecruitmentAction, initial);
  const [dismissedSuccess, setDismissedSuccess] = useState<RecruitmentActionState | null>(null);
  const toastMessage = state.status === "success" && state !== dismissedSuccess ? state.message : "";
  useEffect(() => {
    if (state.status !== "success") return;
    dialogRef.current?.close();
    const timer = window.setTimeout(() => {
      setDismissedSuccess(state);
      router.refresh();
    }, 3_000);
    return () => window.clearTimeout(timer);
  }, [router, state]);
  return <>
    <button type="button" className="button-primary mt-5" onClick={() => dialogRef.current?.showModal()}>이 팀에 지원하기</button>
    <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { if (pending) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]">
      <div className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-5 py-5 sm:px-7"><div><p className="eyebrow">{teamName}</p><h3 id={titleId} className="mt-2 text-2xl font-extrabold tracking-[-0.035em]">{postTitle} 지원</h3><p className="muted mt-2 text-sm">내 기술과 역할, 활동 가능 시간을 확인하고 지원 메시지를 남깁니다.</p></div><button type="button" aria-label="팀원 모집 지원 닫기" disabled={pending} onClick={() => dialogRef.current?.close()} className="button-quiet min-w-11 shrink-0 px-0 text-xl">×</button></div>
      <form action={action} className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <input type="hidden" name="postId" value={postId} /><label className="grid gap-2 text-sm font-medium">보유 기술<input name="skills" required defaultValue={profile?.skills.join(", ")} className="field" /></label><label className="grid gap-2 text-sm font-medium">희망 역할<input name="desiredRole" required defaultValue={profile?.desiredRole} className="field" /></label><label className="grid gap-2 text-sm font-medium">활동 가능 시간<input name="availability" required defaultValue={profile?.availability} className="field" /></label><label className="grid gap-2 text-sm font-medium">지원 메시지<textarea name="message" maxLength={2000} rows={4} required className="field" /></label>{state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)] sm:col-span-2">{state.message}</p> : null}<div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-5 sm:col-span-2 sm:flex-row sm:justify-end"><button type="button" className="button-quiet" disabled={pending} onClick={() => dialogRef.current?.close()}>취소</button><button className="button-primary" disabled={pending}>{pending ? "지원 중" : "지원하기"}</button></div>
      </form>
    </dialog>
    {toastMessage ? <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border border-[var(--primary)] bg-white px-5 py-4 text-sm font-bold text-[var(--ink)] sm:bottom-6">{toastMessage}</div> : null}
  </>;
}

export function RecruitmentDecisionForm({ applicationId, decision }: { applicationId: string; decision: "ACCEPT" | "REJECT" }) {
  const [state, action, pending] = useActionState(decideRecruitmentAction, initial);
  return <form action={action}><input type="hidden" name="applicationId" value={applicationId} /><input type="hidden" name="decision" value={decision} />{decision === "REJECT" ? <ConfirmSubmitButton className="button-danger" confirmMessage="이 팀원 지원을 거절하시겠습니까?" disabled={pending}>{pending ? "처리 중" : "거절"}</ConfirmSubmitButton> : <button className="button-primary" disabled={pending}>{pending ? "처리 중" : "수락"}</button>}{state.message ? <p aria-live="polite" className={`mt-1 text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}</form>;
}
