"use client";

import { useActionState } from "react";

import { changeProgramStatusAction } from "@/app/topics/_management/program-actions";
import { initialProgramActionState } from "@/app/topics/_management/program-form-state";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { FormSection } from "@/shared/ui/form-system";

export function ProgramStatusForm({ id, isPublic, endsAt, appearance = "card", showVisibility = true }: { id: string; isPublic: boolean; endsAt: Date; appearance?: "card" | "embedded"; showVisibility?: boolean }) {
  const [state, action, pending] = useActionState(changeProgramStatusAction, initialProgramActionState);
  const closed = endsAt <= new Date();

  // 설정 화면의 맨 아래 칸. 제목은 줄의 왼쪽 칸에 있고, 여기에는 결과를 말로 적고 단추 하나만 둔다.
  if (!showVisibility) {
    return <form action={action} aria-busy={pending} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-5">
      <input type="hidden" name="programId" value={id} />
      <input type="hidden" name="operation" value="CLOSE" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--ink)]"><UiText>{closed ? "종료일이 지났습니다. 다시 운영하려면 일정에서 종료일을 연장하세요." : "지금 종료하면 프로그램 종료일이 현재 시각으로 변경되고 미처리 항목을 정리합니다."}</UiText></p>
        {state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`mt-1 text-[0.8125rem] ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
      </div>
      {closed ? <p className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"종료됨"}</UiText></p> : <ConfirmSubmitButton className="button-danger button-compact min-h-8 px-3 font-medium max-sm:w-full" confirmMessage="프로그램 종료일을 현재 시각으로 변경하고 대기 중인 승인·지원·모집을 정리합니다. 계속하시겠습니까?" disabled={pending}><UiText>{pending ? "처리 중" : "지금 종료"}</UiText></ConfirmSubmitButton>}
    </form>;
  }

  return (
    <div className="grid gap-5">
      {showVisibility ? <FormSection appearance={appearance} title="공개 설정" description="비공개 프로그램은 관리자만 볼 수 있습니다. 운영 종료 여부와는 별개입니다.">
        <VisibilityForm id={id} visible={isPublic} pending={pending} action={action} />
        {state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}
      </FormSection> : null}

      <form action={action} aria-busy={pending}>
        <FormSection appearance={appearance} title="운영 종료" description={closed ? "종료일이 지났습니다. 다시 운영하려면 일정에서 종료일을 연장하세요." : "지금 종료하면 프로그램 종료일이 현재 시각으로 변경되고 미처리 항목을 정리합니다."}>
          <input type="hidden" name="programId" value={id} />
          <input type="hidden" name="operation" value="CLOSE" />
          <div className="form-action-bar">
            <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
            {closed ? <p className="text-sm text-[var(--muted)]"><UiText>{"종료됨"}</UiText></p> : <ConfirmSubmitButton className="button-danger max-sm:w-full" confirmMessage="프로그램 종료일을 현재 시각으로 변경하고 대기 중인 승인·지원·모집을 정리합니다. 계속하시겠습니까?" disabled={pending}><UiText>{pending ? "처리 중" : "지금 종료"}</UiText></ConfirmSubmitButton>}
          </div>
        </FormSection>
      </form>
    </div>
  );
}

function VisibilityForm({ id, visible, pending, action }: {
  id: string;
  visible: boolean;
  pending: boolean;
  action: (payload: FormData) => void;
}) {
  return (
    <form action={action} aria-busy={pending} className="flex items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] p-4">
      <div><p className="font-bold"><UiText>{"프로그램 공개"}</UiText></p><p className="mt-1 text-sm text-[var(--muted)]"><UiText>{visible ? "학생과 교수진에게 공개 중" : "관리자만 볼 수 있음"}</UiText></p></div>
      <input type="hidden" name="programId" value={id} />
      <input type="hidden" name="operation" value="SET_PUBLIC" />
      <input type="hidden" name="visible" value={String(!visible)} />
      <button type="submit" className={visible ? "button-secondary" : "button-primary"} disabled={pending}><UiText>{visible ? "비공개 전환" : "공개"}</UiText></button>
    </form>
  );
}
