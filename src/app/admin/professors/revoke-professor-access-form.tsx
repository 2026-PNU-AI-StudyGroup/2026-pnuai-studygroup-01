"use client";

import { useActionState } from "react";

import {
  revokeProfessorAccessAction,
  type ProfessorAccessActionState,
} from "@/app/admin/professors/actions";

const initialState: ProfessorAccessActionState = { status: "idle", message: "" };

export function RevokeProfessorAccessForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(revokeProfessorAccessAction, initialState);
  return (
    <form action={action} className="flex flex-wrap items-center justify-end gap-2">
      <input type="hidden" name="email" value={email} />
      <button className="button-quiet" type="submit" disabled={pending}>{pending ? "회수 중" : "권한 회수"}</button>
      {state.message ? <span aria-live="polite" className={`text-xs ${state.status === "error" ? "text-red-700" : "text-green-700"}`}>{state.message}</span> : null}
    </form>
  );
}
