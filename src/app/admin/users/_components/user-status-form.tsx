"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { changeUserStatusAction, type UserStatusActionState } from "@/app/admin/users/_actions/user-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: UserStatusActionState = { status: "idle", message: "" };

export function UserStatusForm({ userId, name, isActive, activeResponsibilityCount }: { userId: string; name: string; isActive: boolean; activeResponsibilityCount: number }) {
  const [state, action, pending] = useActionState(changeUserStatusAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isActive" value={String(!isActive)} />
      {isActive ? <ConfirmSubmitButton className="button-danger button-compact" confirmMessage={`${name} 계정을 비활성화하시겠습니까? 현재 로그인된 기기에서도 모두 로그아웃됩니다.`} disabled={pending || activeResponsibilityCount > 0}><UiText>{pending ? "처리 중" : "비활성화"}</UiText></ConfirmSubmitButton> : <button className="button-secondary button-compact" disabled={pending}><UiText>{pending ? "처리 중" : "다시 활성화"}</UiText></button>}
      {isActive && activeResponsibilityCount > 0 ? <span className="basis-full text-xs text-[var(--warning-ink)]"><UiText>{`담당 프로젝트 ${activeResponsibilityCount}건을 먼저 인계하거나 마감해야 합니다.`}</UiText></span> : null}
      {state.message ? <span aria-live="polite" className={`basis-full text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}
