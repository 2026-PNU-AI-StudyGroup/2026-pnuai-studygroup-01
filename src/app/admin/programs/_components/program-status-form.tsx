"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { changeProgramStatusAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { FormSection } from "@/shared/ui/form-system";

export function ProgramStatusForm({ id, status }: { id: string; status: "DRAFT" | "OPEN" | "CLOSED" }) {
  const [state, action, pending] = useActionState(changeProgramStatusAction, initialProgramActionState);
  const stateDescription = status === "DRAFT" ? "초안 상태입니다. 공개 전에는 사용자에게 표시되지 않습니다." : status === "OPEN" ? "공개 상태입니다. 프로그램을 마감하면 공개 주제와 팀원 모집도 함께 마감됩니다." : "마감된 프로그램입니다. 공개 상태로 되돌릴 수 없습니다.";
  return (
    <form action={action} aria-busy={pending}>
      <FormSection title="공개 상태" description={stateDescription}>
        <input type="hidden" name="programId" value={id} />
        <input type="hidden" name="status" value={status === "DRAFT" ? "OPEN" : "CLOSED"} />
        <div className="form-action-bar">
          <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
          {status === "CLOSED" ? <p className="text-sm text-[var(--muted)]"><UiText>{"마감 상태"}</UiText></p> : status === "DRAFT" ? <button type="submit" className="button-primary max-sm:w-full" disabled={pending}><UiText>{pending ? "처리 중" : "프로그램 공개"}</UiText></button> : <ConfirmSubmitButton className="button-danger max-sm:w-full" confirmMessage="프로그램을 마감하면 공개 주제와 팀원 모집도 함께 마감됩니다. 계속하시겠습니까?" disabled={pending}><UiText>{pending ? "처리 중" : "프로그램 마감"}</UiText></ConfirmSubmitButton>}
        </div>
      </FormSection>
    </form>
  );
}
