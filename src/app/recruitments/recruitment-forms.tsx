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
  return <form action={action} className="space-y-8">
    <fieldset className="grid gap-5 border-0 p-0 sm:grid-cols-2">
      <legend className="mb-5 w-full border-b border-[var(--line)] pb-3 text-lg font-black text-[var(--ink)]">모집 기본 정보</legend>
      <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">모집할 팀<select name="teamId" className="field">{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">모집 제목<input name="title" maxLength={200} required className="field" placeholder="필요한 역할이 드러나는 제목을 입력하세요" /></label>
      <label className="grid gap-2 text-sm font-bold text-[var(--ink)] sm:col-span-2">모집 내용<textarea name="content" maxLength={2000} rows={6} required className="field resize-y" placeholder="프로젝트 상황, 함께할 업무, 협업 방식을 적어 주세요" /><span className="muted text-xs font-normal">최대 2,000자</span></label>
    </fieldset>
    <fieldset className="grid gap-5 border-0 p-0 sm:grid-cols-2">
      <legend className="mb-5 w-full border-b border-[var(--line)] pb-3 text-lg font-black text-[var(--ink)]">함께할 조건</legend>
      <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">필요 기술<input name="requiredSkills" required className="field" placeholder="예: TypeScript, Python" /><span className="muted text-xs font-normal">여러 기술은 쉼표로 구분합니다.</span></label>
      <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">필요 역할<input name="roleNeeded" maxLength={500} required className="field" placeholder="예: 백엔드 API 설계와 구현" /></label>
      <label className="grid gap-2 text-sm font-bold text-[var(--ink)] sm:col-span-2">활동 가능 시간<input name="availability" maxLength={500} required className="field" placeholder="예: 화·목 18시 이후, 주 1회 대면" /></label>
    </fieldset>
    <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="muted text-sm">등록 후 들어온 지원은 ‘작성한 모집’에서 검토합니다.</p>
      <button className="button-primary" disabled={pending}>{pending ? "등록 중" : "모집 글 등록"}</button>
    </div>
    {state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
  </form>;
}

export function RecruitmentApplyForm({ postId, postTitle, teamName, profile }: { postId: string; postTitle: string; teamName: string; profile: StudentProfile | null }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
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
    <button type="button" className="button-primary mt-5 w-full" onClick={() => dialogRef.current?.showModal()}>이 팀에 지원하기</button>
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { if (pending) event.preventDefault(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-[var(--line)] bg-white p-0 text-[var(--ink)] [overscroll-behavior:contain] backdrop:bg-[rgba(23,32,51,.48)]">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-[var(--line)] bg-white px-5 py-5 sm:px-7"><div><p className="text-sm font-extrabold text-[var(--primary)]">{teamName}</p><h3 id={titleId} className="mt-1 text-2xl font-black tracking-[-0.035em]">{postTitle} 지원</h3><p id={descriptionId} className="muted mt-2 text-sm leading-6">팀에 전달할 내 역할과 협업 가능 시간을 확인해 주세요.</p></div><button type="button" aria-label="팀원 모집 지원 닫기" disabled={pending} onClick={() => dialogRef.current?.close()} className="button-quiet min-w-11 shrink-0 px-0 text-xl">×</button></div>
      <form action={action} className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
        <input type="hidden" name="postId" value={postId} />
        <label className="grid gap-2 text-sm font-bold">보유 기술<input name="skills" required defaultValue={profile?.skills.join(", ")} className="field" placeholder="예: TypeScript, Python" /></label>
        <label className="grid gap-2 text-sm font-bold">희망 역할<input name="desiredRole" required defaultValue={profile?.desiredRole} className="field" placeholder="팀에서 맡고 싶은 역할" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">활동 가능 시간<input name="availability" required defaultValue={profile?.availability} className="field" placeholder="회의와 작업이 가능한 시간" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">지원 메시지<textarea aria-label="지원 메시지" name="message" maxLength={2000} rows={6} required className="field resize-y" placeholder="경험과 함께하고 싶은 이유를 구체적으로 적어 주세요" /><span className="muted text-xs font-normal">최대 2,000자</span></label>
        {state.status === "error" ? <p role="alert" className="text-sm font-semibold text-[var(--danger)] sm:col-span-2">{state.message}</p> : null}
        <div className="sticky bottom-0 -mx-5 -mb-6 flex flex-col-reverse gap-2 border-t border-[var(--line)] bg-white px-5 py-4 sm:col-span-2 sm:-mx-7 sm:flex-row sm:justify-end sm:px-7"><button type="button" className="button-quiet" disabled={pending} onClick={() => dialogRef.current?.close()}>취소</button><button className="button-primary" disabled={pending}>{pending ? "지원 중" : "지원서 보내기"}</button></div>
      </form>
    </dialog>
    {toastMessage ? <div role="status" aria-live="polite" className="toast fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md border-l-4 border-[var(--primary)] bg-[var(--ink)] px-5 py-4 text-sm font-bold text-white sm:bottom-6">{toastMessage}</div> : null}
  </>;
}

export function RecruitmentDecisionForm({ applicationId, postId, decision }: { applicationId: string; postId: string; decision: "ACCEPT" | "REJECT" }) {
  const [state, action, pending] = useActionState(decideRecruitmentAction, initial);
  return <form action={action}><input type="hidden" name="applicationId" value={applicationId} /><input type="hidden" name="postId" value={postId} /><input type="hidden" name="decision" value={decision} />{decision === "REJECT" ? <ConfirmSubmitButton className="button-danger" confirmMessage="이 팀원 지원을 거절하시겠습니까?" disabled={pending}>{pending ? "처리 중" : "거절"}</ConfirmSubmitButton> : <button className="button-primary" disabled={pending}>{pending ? "처리 중" : "수락"}</button>}{state.message ? <p aria-live="polite" className={`mt-1 text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}</form>;
}
