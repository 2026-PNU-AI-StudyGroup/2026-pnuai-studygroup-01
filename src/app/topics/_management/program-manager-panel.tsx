"use client";

import { useActionState } from "react";

import { updateProgramManagersAction } from "@/app/topics/_management/program-actions";
import { initialProgramActionState } from "@/app/topics/_management/program-form-state";
import styles from "@/app/topics/_management/program-management.module.css";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { FormSection } from "@/shared/ui/form-system";

export type ProgramManagerCandidate = { id: string; name: string; email: string; assigned: boolean };

// 예전에는 프로젝트 등록 검토 알림이 관리자로 지정된 모든 교수·선생님에게 갔다.
// 여기서 담당자를 골라 두면 그 프로그램 알림은 담당자에게만 간다.
export function ProgramManagerPanel({ programId, candidates }: {
  programId: string;
  candidates: ProgramManagerCandidate[];
}) {
  const [state, action, pending] = useActionState(updateProgramManagersAction, initialProgramActionState);
  return <div className={styles.panel}>
    <form action={action} aria-busy={pending} className={styles.form}>
      <input type="hidden" name="programId" value={programId} />
      <FormSection
        appearance="plain"
        title="담당 관리자"
        description="이 프로그램의 운영 알림 메일을 담당자에게만 보냅니다. 아무도 고르지 않으면 관리자 전체에게 갑니다."
        className={styles.section}
      >
        {candidates.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--muted)]"><UiText>{"지정할 수 있는 관리자 계정이 없습니다."}</UiText></p>
        ) : (
          <fieldset className="grid gap-3">
            <legend className="sr-only"><UiText>{"담당 관리자 선택"}</UiText></legend>
            {candidates.map((candidate) => (
              <label key={candidate.id} className="flex items-start justify-between gap-5 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0">
                <span className="min-w-0">
                  <strong className="block text-sm">{candidate.name}</strong>
                  <span className="mt-0.5 block truncate text-sm leading-6 text-[var(--muted)]">{candidate.email}</span>
                </span>
                <UiInput
                  name="managerIds"
                  type="checkbox"
                  value={candidate.id}
                  defaultChecked={candidate.assigned}
                  className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                />
              </label>
            ))}
          </fieldset>
        )}
      </FormSection>
      <div className={styles.actionBar}>
        <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>{state.message}</p> : null}</div>
        <button type="submit" className="button-primary" disabled={pending}>{pending ? "저장 중" : "담당 관리자 저장"}</button>
      </div>
    </form>
  </div>;
}
