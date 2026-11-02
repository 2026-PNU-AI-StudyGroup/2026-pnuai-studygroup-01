"use client";

import { useActionState } from "react";

import { updateProgramManagersAction } from "@/app/topics/_management/program-actions";
import { initialProgramActionState } from "@/app/topics/_management/program-form-state";
import { ActionBar } from "@/app/topics/_management/program-management-forms";
import styles from "@/app/topics/_management/program-management.module.css";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiInput } from "@/modules/translation/ui/localized-elements";

export type ProgramManagerCandidate = { id: string; name: string; email: string; assigned: boolean };

// 예전에는 프로젝트 등록 검토 알림이 관리자로 지정된 모든 교수·선생님에게 갔다.
// 여기서 담당자를 골라 두면 그 프로그램 알림은 담당자에게만 간다. 제목과 설명은 설정 줄의 왼쪽 칸에 있다.
export function ProgramManagerPanel({ programId, candidates }: {
  programId: string;
  candidates: ProgramManagerCandidate[];
}) {
  const [state, action, pending] = useActionState(updateProgramManagersAction, initialProgramActionState);
  return <div className={styles.panel}>
    <form action={action} aria-busy={pending} className={styles.form}>
      <input type="hidden" name="programId" value={programId} />
      <div className={styles.fields}>
        {candidates.length === 0 ? (
          <p className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"지정할 수 있는 관리자 계정이 없습니다."}</UiText></p>
        ) : (
          <fieldset className="grid gap-2.5">
            <legend className="sr-only"><UiText>{"담당 관리자 선택"}</UiText></legend>
            {candidates.map((candidate) => (
              <label key={candidate.id} className="flex min-w-0 items-center gap-2.5 text-sm">
                <UiInput name="managerIds" type="checkbox" value={candidate.id} defaultChecked={candidate.assigned} />
                <span className="font-medium">{candidate.name}</span>
                <span className="min-w-0 truncate text-[0.8125rem] text-[var(--muted)]">{candidate.email}</span>
              </label>
            ))}
          </fieldset>
        )}
      </div>
      <ActionBar state={state} pending={pending} label="담당 관리자 저장" />
    </form>
  </div>;
}
