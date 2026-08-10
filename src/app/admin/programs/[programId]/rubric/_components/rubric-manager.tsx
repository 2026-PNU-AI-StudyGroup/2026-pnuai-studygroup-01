"use client";

import { useActionState, useRef, useState } from "react";

import {
  createCriterionAction,
  deleteCriterionAction,
  moveCriterionAction,
  rubricInitialState,
} from "@/app/admin/programs/[programId]/rubric/_actions/rubric-actions";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmationDialog } from "@/shared/ui/confirmation-dialog";

export type CriterionRow = { id: string; label: string; maxPoints: number };

export function RubricManager({ programId, criteria, editable }: { programId: string; criteria: CriterionRow[]; editable: boolean }) {
  const [state, action, pending] = useActionState(createCriterionAction.bind(null, programId), rubricInitialState);
  const [pendingDeletion, setPendingDeletion] = useState<CriterionRow | null>(null);
  const deleteForms = useRef<Record<string, HTMLFormElement | null>>({});
  const total = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);

  return (
    <div className="grid gap-5">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--ink)]"><UiText>{"항목 이름"}</UiText></span>
          <UiInput className="form-control bg-white" name="label" type="text" maxLength={60} placeholder="예: 완성도" required disabled={!editable} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-[var(--ink)]"><UiText>{"배점"}</UiText></span>
          <UiInput className="form-control w-24 bg-white" name="maxPoints" type="number" min={1} max={100} defaultValue={10} required disabled={!editable} />
        </label>
        <button className="button-primary" type="submit" disabled={pending || !editable}>
          <UiText>{pending ? "추가 중" : "항목 추가"}</UiText>
        </button>
        {state.message ? (
          <span className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></span>
        ) : null}
      </form>
      {!editable ? <p className="text-sm font-semibold text-[var(--muted)]"><UiText>{"이미 채점된 보고서가 있어 항목·배점·순서는 고정되었습니다."}</UiText></p> : null}

      {criteria.length ? (
        <>
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {criteria.map((criterion, index) => (
              <li key={criterion.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <strong className="text-[var(--ink)]">{criterion.label}</strong>
                  <span className="muted ml-2 text-xs">{criterion.maxPoints}<UiText>{"점"}</UiText></span>
                </div>
                <div className="flex items-center gap-1">
                  <form action={async (fd) => { await moveCriterionAction(criterion.id, "up", rubricInitialState, fd); }}>
                    <button className="button-quiet text-xs" type="submit" disabled={!editable || index === 0}><UiText>{"위로"}</UiText></button>
                  </form>
                  <form action={async (fd) => { await moveCriterionAction(criterion.id, "down", rubricInitialState, fd); }}>
                    <button className="button-quiet text-xs" type="submit" disabled={!editable || index === criteria.length - 1}><UiText>{"아래로"}</UiText></button>
                  </form>
                  <form ref={(form) => { deleteForms.current[criterion.id] = form; }} action={async (fd) => { await deleteCriterionAction(criterion.id, rubricInitialState, fd); }}>
                    <button className="button-quiet text-xs text-[var(--danger)]" type="button" disabled={!editable} onClick={() => setPendingDeletion(criterion)}><UiText>{"삭제"}</UiText></button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm font-semibold text-[var(--ink)]">
            <UiText>{"총 배점"}</UiText>{" "}{total}<UiText>{"점"}</UiText>
          </p>
        </>
      ) : (
        <p className="muted text-sm"><UiText>{"아직 채점 항목이 없습니다. 완성도·발표·창의성 등 항목을 추가해 주세요."}</UiText></p>
      )}
      <ConfirmationDialog
        open={pendingDeletion !== null}
        title="채점 항목 삭제"
        description={pendingDeletion ? `‘${pendingDeletion.label}’ 항목을 삭제합니다. 아직 채점 전이라도 이 작업은 되돌릴 수 없습니다.` : ""}
        confirmLabel="삭제"
        onCancel={() => setPendingDeletion(null)}
        onConfirm={() => {
          if (pendingDeletion) deleteForms.current[pendingDeletion.id]?.requestSubmit();
          setPendingDeletion(null);
        }}
      />
    </div>
  );
}
