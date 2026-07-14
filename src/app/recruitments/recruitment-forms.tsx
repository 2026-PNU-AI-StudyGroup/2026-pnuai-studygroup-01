"use client";
import { useActionState } from "react";
import { applyRecruitmentAction, createRecruitmentPostAction, decideRecruitmentAction, type RecruitmentActionState } from "@/app/recruitments/actions";
const initial: RecruitmentActionState = { status: "idle", message: "" };

export function RecruitmentPostForm({ teams }: { teams: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(createRecruitmentPostAction, initial);
  if (!teams.length) return null;
  return <form action={action} className="grid gap-4 border-y border-[var(--line)] bg-[var(--surface-subtle)] p-5 sm:grid-cols-2">
    <label className="grid gap-2 text-sm font-medium">팀<select name="teamId" className="field">{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">제목<input name="title" maxLength={200} required className="field" /></label>
    <label className="grid gap-2 text-sm font-medium sm:col-span-2">모집 내용<textarea name="content" maxLength={2000} rows={4} required className="field" /></label>
    <label className="grid gap-2 text-sm font-medium">필요 기술<input name="requiredSkills" required className="field" placeholder="TypeScript, Python" /></label>
    <label className="grid gap-2 text-sm font-medium">필요 역할<input name="roleNeeded" maxLength={500} required className="field" /></label>
    <label className="grid gap-2 text-sm font-medium">활동 시간<input name="availability" maxLength={500} required className="field" /></label>
    <button className="button-primary self-end" disabled={pending}>{pending ? "등록 중" : "모집 글 등록"}</button>
    {state.message ? <p className={`sm:col-span-2 ${state.status === "error" ? "text-red-700" : "text-green-700"}`}>{state.message}</p> : null}
  </form>;
}

export function RecruitmentApplyForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(applyRecruitmentAction, initial);
  return <form action={action} className="mt-5 grid gap-3 border-l-2 border-[var(--teal)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-2">
    <input type="hidden" name="postId" value={postId} /><label className="grid gap-2 text-sm font-medium">보유 기술<input name="skills" required className="field" /></label><label className="grid gap-2 text-sm font-medium">희망 역할<input name="desiredRole" required className="field" /></label><label className="grid gap-2 text-sm font-medium">활동 가능 시간<input name="availability" required className="field" /></label><label className="grid gap-2 text-sm font-medium">지원 메시지<textarea name="message" maxLength={2000} required className="field" /></label><button className="button-primary justify-self-start" disabled={pending}>{pending ? "지원 중" : "지원하기"}</button>{state.message ? <p className={state.status === "error" ? "text-red-700" : "text-green-700"}>{state.message}</p> : null}
  </form>;
}

export function RecruitmentDecisionForm({ applicationId, decision }: { applicationId: string; decision: "ACCEPT" | "REJECT" }) {
  const [state, action, pending] = useActionState(decideRecruitmentAction, initial);
  return <form action={action}><input type="hidden" name="applicationId" value={applicationId} /><input type="hidden" name="decision" value={decision} /><button className={decision === "ACCEPT" ? "button-primary" : "button-quiet"} disabled={pending}>{pending ? "처리 중" : decision === "ACCEPT" ? "수락" : "거절"}</button>{state.message ? <p className={`mt-1 text-xs ${state.status === "error" ? "text-red-700" : "text-green-700"}`}>{state.message}</p> : null}</form>;
}
