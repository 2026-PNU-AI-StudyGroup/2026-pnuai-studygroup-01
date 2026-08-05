"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import {
  grantProfessorAccessAction,
  type ProfessorAccessActionState,
} from "@/app/admin/professors/_actions/professor-actions";

const initialState: ProfessorAccessActionState = { status: "idle", message: "" };

export function ProfessorAccessForm() {
  const [state, action, pending] = useActionState(grantProfessorAccessAction, initialState);
  return (
    <form action={action} className="admin-panel grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-6">
      <label className="grid gap-2 text-sm font-medium"><UiText>{"부산대학교 교수 이메일"}</UiText><input name="email" type="email" placeholder="professor@pusan.ac.kr" required className="field" /></label>
      <button type="submit" disabled={pending} className="button-primary max-sm:w-full"><UiText>{pending ? "등록 중" : "교수 권한 허용"}</UiText></button>
      {state.message ? <p aria-live="polite" className={`sm:col-span-2 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
    </form>
  );
}
