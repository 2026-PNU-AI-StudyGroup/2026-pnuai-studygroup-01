"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { createProgramAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import type { AcademicCycleRecord } from "@/modules/academic-cycle/application/academic-cycle-ports";
import { CustomSelect } from "@/shared/ui/custom-select";

export function ProgramForm({ cycles, successHref }: { cycles: AcademicCycleRecord[]; successHref?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createProgramAction, initialProgramActionState);
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  return <form action={action} aria-busy={pending} className="border-y border-[var(--line)] bg-white">
    <section className="grid gap-5 py-7 sm:grid-cols-2" aria-labelledby="program-identity-title">
      <div className="sm:col-span-2"><h2 id="program-identity-title" className="text-base font-semibold">프로그램 정보</h2><p className="muted mt-1 text-sm">학생과 교수에게 표시할 이름과 성격을 정합니다.</p></div>
      <label className="grid gap-2 text-sm font-medium">학기<CustomSelect name="academicCycleId" defaultValue={cycles[0]?.id} options={cycles.map((cycle) => ({ value: cycle.id, label: `${cycle.academicYear}학년도 ${cycle.term === "FIRST" ? "1" : "2"}학기` }))} /></label>
      <label className="grid gap-2 text-sm font-medium">분류<input name="category" maxLength={100} required className="field" placeholder="예: 캡스톤, 해커톤, 교육 프로그램" /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">프로그램명<input name="name" maxLength={200} required className="field" placeholder="예: 창의융합 해커톤" /></label>
      <label className="grid gap-2 text-sm font-medium sm:col-span-2">설명<textarea name="description" maxLength={5000} required rows={4} className="field" /></label>
    </section>
    <section className="grid gap-5 border-t border-[var(--line)] py-7 sm:grid-cols-2" aria-labelledby="program-period-title">
      <div className="sm:col-span-2"><h2 id="program-period-title" className="text-base font-semibold">운영 기간</h2><p className="muted mt-1 text-sm">프로그램이 실제로 운영되는 시작과 종료 시각입니다.</p></div>
      <label className="grid gap-2 text-sm font-medium">운영 시작<input name="startsAt" type="datetime-local" required className="field" /></label>
      <label className="grid gap-2 text-sm font-medium">운영 종료<input name="endsAt" type="datetime-local" required className="field" /></label>
    </section>
    <div className="flex justify-end border-t border-[var(--line)] py-5"><button type="submit" className="button-primary max-sm:w-full" disabled={pending || !cycles.length}>{pending ? "등록 중" : "초안 등록"}</button></div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`pb-5 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
  </form>;
}
