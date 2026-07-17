"use client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { changeProgramStatusAction, createProgramAction, type ProgramActionState } from "@/app/admin/programs/actions";
import type { AcademicCycleRecord } from "@/modules/academic-cycle/application/academic-cycle-ports";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
const initial: ProgramActionState = { status: "idle", message: "" };

export function ProgramForm({ cycles, successHref }: { cycles: AcademicCycleRecord[]; successHref?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createProgramAction, initial);
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);
  return <form action={action} className="grid gap-4 border-y border-[var(--line)] bg-[var(--surface-subtle)] p-5 sm:grid-cols-2">
    <label className="grid gap-2 text-sm font-medium">학기<select name="academicCycleId" className="field">{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.academicYear}학년도 {cycle.term === "FIRST" ? "1" : "2"}학기</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">프로그램명<input name="name" maxLength={200} required className="field" placeholder="예: 창의융합 해커톤" /></label>
    <label className="grid gap-2 text-sm font-medium">분류<input name="category" maxLength={100} required className="field" placeholder="예: 캡스톤, 해커톤, 교육 프로그램" /></label>
    <label className="grid gap-2 text-sm font-medium sm:col-span-2">설명<textarea name="description" maxLength={5000} required rows={4} className="field" /></label>
    <label className="grid gap-2 text-sm font-medium">운영 시작<input name="startsAt" type="datetime-local" required className="field" /></label>
    <label className="grid gap-2 text-sm font-medium">운영 종료<input name="endsAt" type="datetime-local" required className="field" /></label>
    <button className="button-primary justify-self-start" disabled={pending || !cycles.length}>{pending ? "등록 중" : "초안 등록"}</button>{state.message ? <p aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>{state.message}</p> : null}
  </form>;
}

export function ProgramStatusForm({ id, status }: { id: string; status: "DRAFT" | "OPEN" | "CLOSED" }) {
  const [state, action, pending] = useActionState(changeProgramStatusAction, initial);
  if (status === "CLOSED") return null;
  return <form action={action} className="text-right"><input type="hidden" name="programId" value={id} /><input type="hidden" name="status" value={status === "DRAFT" ? "OPEN" : "CLOSED"} />{status === "DRAFT" ? <button className="button-primary" disabled={pending}>{pending ? "처리 중" : "공개"}</button> : <ConfirmSubmitButton className="button-danger" confirmMessage="프로그램을 마감하면 공개 주제와 팀원 모집도 함께 마감됩니다. 계속하시겠습니까?" disabled={pending}>{pending ? "처리 중" : "마감"}</ConfirmSubmitButton>}{state.message ? <p aria-live="polite" className={`mt-1 text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}</form>;
}
