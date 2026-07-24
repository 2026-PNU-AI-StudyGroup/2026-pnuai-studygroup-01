"use client";

import { useActionState } from "react";

import {
  grantProfessorAccessAction,
  type ProfessorAccessActionState,
} from "@/app/admin/professors/_actions/professor-actions";

const initialState: ProfessorAccessActionState = { status: "idle", message: "" };

export function ProfessorAccessForm() {
  const [state, action, pending] = useActionState(grantProfessorAccessAction, initialState);
  return (
    <form action={action} className="grid gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6">
      <label className="grid gap-2 text-sm font-medium">부산대학교 교수 이메일<input name="email" type="email" placeholder="professor@pusan.ac.kr" required className="field" /></label>
      <button type="submit" disabled={pending} className="button-primary self-end max-sm:w-full">{pending ? "등록 중" : "교수 권한 허용"}</button>
      {state.message ? <p aria-live="polite" className={`sm:col-span-2 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
    </form>
  );
}
