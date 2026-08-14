"use client";

import { useActionState } from "react";

import { retryFailedEmailDeliveryAction, type EmailDeliveryActionState } from "@/app/admin/emails/_actions/email-delivery-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: EmailDeliveryActionState = { status: "idle", message: "" };

export function RetryEmailDeliveryForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(retryFailedEmailDeliveryAction, initialState);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmitButton className="button-secondary" confirmMessage="이 실패 작업을 이메일 대기열에 다시 등록하시겠습니까?" disabled={pending}>
        <UiText>{pending ? "재등록 중" : "다시 대기열에 등록"}</UiText>
      </ConfirmSubmitButton>
      {state.message ? <span role={state.status === "error" ? "alert" : "status"} className={`text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}
