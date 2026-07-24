"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { createProgramAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import type { AcademicCycleRecord } from "@/modules/academic-cycle/application/academic-cycle-ports";

export function ProgramForm({ cycles, successHref }: { cycles: AcademicCycleRecord[]; successHref?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createProgramAction, initialProgramActionState);
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  return <form action={action} aria-busy={pending} className="grid gap-5 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-5 sm:grid-cols-2 sm:p-6">
    <label className="grid gap-2 text-sm font-medium">학기<select name="academicCycleId" className="field">{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.academicYear}학년도 {cycle.term === "FIRST" ? "1" : "2"}학기</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium">프로그램명<input name="name" maxLength={200} required className="field" placeholder="예: 창의융합 해커톤" /></label>
    <label className="grid gap-2 text-sm font-medium">분류<input name="category" maxLength={100} required className="field" placeholder="예: 캡스톤, 해커톤, 교육 프로그램" /></label>
    <label className="grid gap-2 text-sm font-medium sm:col-span-2">설명<textarea name="description" maxLength={5000} required rows={4} className="field" /></label>
    <label className="grid gap-2 text-sm font-medium">운영 시작<input name="startsAt" type="datetime-local" required className="field" /></label>
    <label className="grid gap-2 text-sm font-medium">운영 종료<input name="endsAt" type="datetime-local" required className="field" /></label>
    <div className="flex justify-end border-t border-[var(--line)] pt-5 sm:col-span-2"><button type="submit" className="button-primary max-sm:w-full" disabled={pending || !cycles.length}>{pending ? "등록 중" : "초안 등록"}</button></div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)] sm:col-span-2" : "text-[var(--success)] sm:col-span-2"}>{state.message}</p> : null}
  </form>;
}
