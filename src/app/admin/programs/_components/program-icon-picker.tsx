"use client";

import { useActionState } from "react";

import { changeProgramIconAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { PROGRAM_ICON_KEYS, PROGRAM_ICON_LABEL, type ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard } from "@/shared/ui/form-system";
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
    <details className="relative text-left">
      <summary className="button-secondary cursor-pointer list-none"><UiText>{"아이콘 변경"}</UiText></summary>
      <form action={action} className="absolute right-0 z-20 mt-2 w-72 rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-white p-3 shadow-[0_12px_32px_rgb(23_32_51_/_0.14)]">
        <input type="hidden" name="programId" value={id} />
        <div className="grid grid-cols-4 gap-1">
          {PROGRAM_ICON_KEYS.map((candidate) => (
            <button key={candidate} type="submit" name="icon" value={candidate} disabled={pending} aria-label={`${PROGRAM_ICON_LABEL[candidate]} 아이콘으로 변경`} className={`grid size-11 place-items-center rounded-lg border transition-colors ${candidate === icon ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink)]"}`}>
              <ProgramIcon icon={candidate} className="size-5" />
            </button>
          ))}
        </div>
        {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`mt-2 text-xs font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
      </form>
    </details>
  );
}
