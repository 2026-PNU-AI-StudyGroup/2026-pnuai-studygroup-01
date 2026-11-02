"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import {
  revokeProfessorAccessAction,
  type ProfessorAccessActionState,
} from "@/app/admin/professors/_actions/professor-actions";
import { adminRowButton } from "@/app/_components/admin-workspace";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: ProfessorAccessActionState = { status: "idle", message: "" };

// 담당 프로젝트가 있으면 버튼만 막는다. 이유는 담당 칸의 숫자와 표 아래 한 줄이 말해 준다.
export function RevokeProfessorAccessForm({ email, activeResponsibilityCount }: { email: string; activeResponsibilityCount: number }) {
  const [state, action, pending] = useActionState(revokeProfessorAccessAction, initialState);
  const blocked = activeResponsibilityCount > 0;
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="email" value={email} />
      <ConfirmSubmitButton
        className={adminRowButton}
        confirmMessage={`${email}의 교수 권한을 회수하시겠습니까? 해당 계정은 학생 역할로 변경됩니다.`}
        disabled={pending || blocked}
        title={blocked ? `담당 중인 프로젝트 ${activeResponsibilityCount}건을 먼저 인계하거나 마감해야 합니다.` : undefined}
      >
        <UiText>{pending ? "회수 중" : "권한 회수"}</UiText>
      </ConfirmSubmitButton>
      {state.message ? <span aria-live="polite" className={`text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}
