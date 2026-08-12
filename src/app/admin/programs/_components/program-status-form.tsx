"use client";

import { useActionState } from "react";

import { changeProgramStatusAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { FormSection } from "@/shared/ui/form-system";

export function ProgramStatusForm({ id, isPublic, lifecycleStatus }: { id: string; isPublic: boolean; lifecycleStatus: "ACTIVE" | "CLOSED" }) {
  const [state, action, pending] = useActionState(changeProgramStatusAction, initialProgramActionState);
  const closed = lifecycleStatus === "CLOSED";

  return (
    <div className="grid gap-5">
      <form action={action} aria-busy={pending}>
        <FormSection title="공개 설정" description={isPublic ? "사용자에게 보이는 프로그램입니다. 운영 마감 여부와는 별개로 언제든 비공개로 전환할 수 있습니다." : "관리자만 볼 수 있는 비공개 프로그램입니다. 준비가 되면 공개하세요."}>
          <input type="hidden" name="programId" value={id} />
          <input type="hidden" name="operation" value="SET_PUBLIC" />
          <input type="hidden" name="isPublic" value={String(!isPublic)} />
          <div className="form-action-bar">
            <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
            <button type="submit" className={isPublic ? "button-secondary max-sm:w-full" : "button-primary max-sm:w-full"} disabled={pending}>
              <UiText>{pending ? "처리 중" : isPublic ? "비공개로 전환" : "프로그램 공개"}</UiText>
            </button>
          </div>
        </FormSection>
      </form>

      <form action={action} aria-busy={pending}>
        <FormSection title="운영 마감" description={closed ? "운영이 마감되었습니다. 프로젝트와 모집은 다시 열 수 없습니다." : "운영을 마감하면 미처리 승인·지원·모집을 종료하고 진행 중인 프로젝트를 마감합니다."}>
          <input type="hidden" name="programId" value={id} />
          <input type="hidden" name="operation" value="CLOSE" />
          <div className="form-action-bar">
            <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
            {closed ? <p className="text-sm text-[var(--muted)]"><UiText>{"마감 상태"}</UiText></p> : <ConfirmSubmitButton className="button-danger max-sm:w-full" confirmMessage="프로그램 운영을 마감하면 진행 중인 프로젝트와 모집, 대기 중인 승인·지원을 함께 종료합니다. 계속하시겠습니까?" disabled={pending}><UiText>{pending ? "처리 중" : "프로그램 운영 마감"}</UiText></ConfirmSubmitButton>}
          </div>
        </FormSection>
      </form>
    </div>
  );
}
