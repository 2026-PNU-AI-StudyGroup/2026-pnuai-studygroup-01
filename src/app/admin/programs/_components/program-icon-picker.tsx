"use client";

import { useActionState } from "react";

import { changeProgramIconAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { PROGRAM_ICON_KEYS, PROGRAM_ICON_LABEL, type ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard, FormSection } from "@/shared/ui/form-system";
import { ProgramIcon } from "@/shared/ui/program-icon";

export function ProgramIconPicker({ name = "icon", value = "FOLDER", legend = "프로그램 아이콘" }: {
  name?: string;
  value?: ProgramIconKey;
  legend?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold"><UiText>{legend}</UiText></legend>
      <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"목록에서 프로그램을 구분하는 표식입니다."}</UiText></p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {PROGRAM_ICON_KEYS.map((icon) => (
          <ChoiceCard
            key={icon}
            className="choice-card--icon"
            name={name}
            value={icon}
            defaultChecked={icon === value}
            label={PROGRAM_ICON_LABEL[icon]}
            visual={<ProgramIcon icon={icon} className="size-5" />}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function ProgramIconForm({ id, icon }: { id: string; icon: ProgramIconKey }) {
  const [state, action, pending] = useActionState(changeProgramIconAction, initialProgramActionState);
  return (
    <form action={action} aria-busy={pending}>
      <FormSection title="프로그램 아이콘" description="프로그램 목록과 프로젝트 탐색에서 표시할 아이콘을 정합니다.">
        <input type="hidden" name="programId" value={id} />
        <ProgramIconPicker value={icon} legend="아이콘 선택" />
        <div className="form-action-bar mt-5">
          <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
          <button type="submit" className="button-primary max-sm:w-full" disabled={pending}><UiText>{pending ? "저장 중" : "아이콘 저장"}</UiText></button>
        </div>
      </FormSection>
    </form>
  );
}
