"use client";

import { useActionState } from "react";

import {
  createAcademicCycleAction,
  type AcademicCycleActionState,
} from "@/app/admin/academic-cycles/_actions/academic-cycle-actions";
import { CustomSelect } from "@/shared/ui/custom-select";

const initialState: AcademicCycleActionState = { status: "idle", message: "" };

export function AcademicCycleForm() {
  const [state, action, pending] = useActionState(
    createAcademicCycleAction,
    initialState,
  );

  return (
    <form action={action} className="grid gap-5 border-y border-[var(--line)] bg-white py-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <label className="grid gap-2 text-sm font-medium">
        학년도
        <input
          name="academicYear"
          type="number"
          min="2000"
          max="9999"
          defaultValue={new Date().getFullYear()}
          required
          className="field"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        학기
        <CustomSelect name="term" defaultValue="FIRST" options={[
          { value: "FIRST", label: "1학기" },
          { value: "SECOND", label: "2학기" },
        ]} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="button-primary self-end max-sm:w-full"
      >
        {pending ? "등록 중" : "학기 등록"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`sm:col-span-3 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
