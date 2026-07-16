"use client";

import { useActionState } from "react";

import { changeUserStatusAction, type UserStatusActionState } from "@/app/admin/users/actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: UserStatusActionState = { status: "idle", message: "" };

export function UserStatusForm({ userId, name, isActive, disabled }: { userId: string; name: string; isActive: boolean; disabled: boolean }) {
  const [state, action, pending] = useActionState(changeUserStatusAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 sm:justify-end">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isActive" value={String(!isActive)} />
      {isActive ? <ConfirmSubmitButton className="button-danger" confirmMessage={`${name} 계정을 비활성화하시겠습니까? 현재 로그인된 세션도 모두 종료됩니다.`} disabled={pending || disabled}>{pending ? "처리 중" : "비활성화"}</ConfirmSubmitButton> : <button className="button-secondary" disabled={pending}>{pending ? "처리 중" : "다시 활성화"}</button>}
      {state.message ? <span aria-live="polite" className={`basis-full text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</span> : null}
    </form>
  );
}
