"use client";

import { useActionState } from "react";

import {
  renameProgramCategoryAction,
  type ProgramCategoryActionState,
} from "@/app/admin/program-categories/_actions/program-category-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { TextInput } from "@/shared/ui/form-system";

// 초기 상태는 "use server" 파일에서 export 하면 화면이 500 으로 죽는다. 여기 둔다.
const initialState: ProgramCategoryActionState = { status: "idle", message: "" };

export function CategoryRenameForm({ category }: { category: string }) {
  const [state, action, pending] = useActionState(renameProgramCategoryAction, initialState);
  const inputId = `category-rename-${category}`;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="from" value={category} />
      <label className="sr-only" htmlFor={inputId}><UiText>{"새 분류 이름"}</UiText></label>
      <TextInput
        id={inputId}
        name="to"
        defaultValue={category}
        maxLength={100}
        required
        className="form-control h-9 w-56 py-1 text-sm"
      />
      <button type="submit" className="button-secondary button-compact" disabled={pending}>
        <UiText>{pending ? "저장 중" : "이름 변경"}</UiText>
      </button>
      {state.message ? (
        <span
          aria-live="polite"
          role={state.status === "error" ? "alert" : undefined}
          className={`basis-full text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
        >
          <UiText>{state.message}</UiText>
        </span>
      ) : null}
    </form>
  );
}
