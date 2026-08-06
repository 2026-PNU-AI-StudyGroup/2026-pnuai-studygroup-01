"use client";

import { useActionState } from "react";

import { changeStudentProjectCreationAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { FormSection } from "@/shared/ui/form-system";

export function StudentProjectCreationForm({ id, enabled, disabled = false }: {
  id: string;
  enabled: boolean;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(changeStudentProjectCreationAction, initialProgramActionState);
  return (
    <form action={action} aria-busy={pending}>
      <FormSection title="학생 프로젝트 제안" description="학생이 새 프로젝트를 제안할 수 있는지 관리합니다.">
        <input type="hidden" name="programId" value={id} />
        <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
        <p className="text-sm"><UiText>{enabled ? "현재 학생 프로젝트 제안이 허용되어 있습니다." : "현재 학생 프로젝트 제안이 중지되어 있습니다."}</UiText></p>
        <div className="form-action-bar mt-5">
          <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
          {disabled ? <p className="text-sm text-[var(--muted)]"><UiText>{"마감된 프로그램에서는 이 설정을 변경할 수 없습니다."}</UiText></p> : <button type="submit" className="button-secondary max-sm:w-full" disabled={pending}><UiText>{pending ? "변경 중" : enabled ? "학생 제안 중지" : "학생 제안 허용"}</UiText></button>}
        </div>
      </FormSection>
    </form>
  );
}
