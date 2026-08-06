"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import {
  revokeProfessorAccessAction,
  type ProfessorAccessActionState,
} from "@/app/admin/professors/_actions/professor-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: ProfessorAccessActionState = { status: "idle", message: "" };

export function RevokeProfessorAccessForm({ email, activeResponsibilityCount }: { email: string; activeResponsibilityCount: number }) {
  const [state, action, pending] = useActionState(revokeProfessorAccessAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="email" value={email} />
      <ConfirmSubmitButton className="button-danger" confirmMessage={`${email}의 교수 권한을 회수하시겠습니까? 해당 계정은 학생 역할로 변경됩니다.`} disabled={pending || activeResponsibilityCount > 0}><UiText>{pending ? "회수 중" : "권한 회수"}</UiText></ConfirmSubmitButton>
      {activeResponsibilityCount > 0 ? <span className="basis-full text-right text-xs text-[var(--warning-ink)]"><UiText>{`담당 중인 프로젝트 ${activeResponsibilityCount}건을 먼저 인계하거나 마감해야 합니다.`}</UiText></span> : null}
      {state.message ? <span aria-live="polite" className={`text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}
