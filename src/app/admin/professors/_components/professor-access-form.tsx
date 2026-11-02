"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { TextInput } from "@/shared/ui/form-system";
import { useActionState } from "react";

import {
  grantProfessorAccessAction,
  type ProfessorAccessActionState,
} from "@/app/admin/professors/_actions/professor-actions";

const initialState: ProfessorAccessActionState = { status: "idle", message: "" };

// 권한 목록 카드 머리 바로 아래에 붙는 한 줄 양식. 이름표는 칸 위에, 버튼은 칸 바닥에 맞춘다.
export function ProfessorAccessForm() {
  const [state, action, pending] = useActionState(grantProfessorAccessAction, initialState);
  return (
    <form action={action} className="grid gap-2 px-5 pb-4 sm:grid-cols-[minmax(0,26rem)_auto] sm:items-end sm:justify-start sm:gap-x-3">
      <label className="grid gap-2 text-sm font-medium"><UiText>{"부산대학교 교수 이메일"}</UiText><TextInput name="email" type="email" placeholder="professor@pusan.ac.kr" required /></label>
      <button type="submit" disabled={pending} className="button-primary max-sm:w-full"><UiText>{pending ? "등록 중" : "교수 권한 부여"}</UiText></button>
      {state.message ? <p aria-live="polite" className={`text-[0.8125rem] sm:col-span-2 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
    </form>
  );
}
