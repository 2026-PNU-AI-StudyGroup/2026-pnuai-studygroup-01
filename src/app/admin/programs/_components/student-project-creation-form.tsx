"use client";

import { useActionState } from "react";

import { changeStudentProjectCreationAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export function StudentProjectCreationForm({ id, enabled, disabled }: {
  id: string;
  enabled: boolean;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(changeStudentProjectCreationAction, initialProgramActionState);
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="programId" value={id} />
      <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
      <button type="submit" className="button-quiet min-h-9 px-3 text-xs" disabled={pending || disabled}>
        <UiText>{pending ? "변경 중" : enabled ? "학생 생성 중지" : "학생 생성 허용"}</UiText>
      </button>
      {state.message ? <p aria-live="polite" className={`mt-1 text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
    </form>
  );
}
