"use client";

import { useActionState } from "react";

import { withdrawAccountAction, type AccountWithdrawalActionState } from "@/app/account/_actions/account-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: AccountWithdrawalActionState = { status: "idle", message: "" };

export function AccountWithdrawalForm() {
  const [state, action, pending] = useActionState(withdrawAccountAction, initialState);
  return (
    <form action={action}>
      <ConfirmSubmitButton
        disabled={pending}
        className="button-danger"
        confirmMessage="계정을 탈퇴하면 모든 세션이 종료되고 다시 로그인할 수 없습니다. 프로젝트 이력과 작성물은 보존됩니다. 계속하시겠습니까?"
      >
        <UiText>{pending ? "처리 중" : "계정 탈퇴"}</UiText>
      </ConfirmSubmitButton>
      {state.message ? <p role="alert" className="mt-3 text-sm font-semibold text-[var(--danger)]"><UiText>{state.message}</UiText></p> : null}
    </form>
  );
}
