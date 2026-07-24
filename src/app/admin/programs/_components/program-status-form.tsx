"use client";

import { useActionState } from "react";

import { changeProgramStatusAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

export function ProgramStatusForm({ id, status }: { id: string; status: "DRAFT" | "OPEN" | "CLOSED" }) {
  const [state, action, pending] = useActionState(changeProgramStatusAction, initialProgramActionState);
  if (status === "CLOSED") return null;
  return <form action={action} className="text-right"><input type="hidden" name="programId" value={id} /><input type="hidden" name="status" value={status === "DRAFT" ? "OPEN" : "CLOSED"} />{status === "DRAFT" ? <button className="button-primary" disabled={pending}>{pending ? "처리 중" : "공개"}</button> : <ConfirmSubmitButton className="button-danger" confirmMessage="프로그램을 마감하면 공개 주제와 팀원 모집도 함께 마감됩니다. 계속하시겠습니까?" disabled={pending}>{pending ? "처리 중" : "마감"}</ConfirmSubmitButton>}{state.message ? <p aria-live="polite" className={`mt-1 text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}</form>;
}
