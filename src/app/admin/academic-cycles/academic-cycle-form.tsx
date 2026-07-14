"use client";

import { useActionState } from "react";

import {
  createAcademicCycleAction,
  type AcademicCycleActionState,
} from "@/app/admin/academic-cycles/actions";

const initialState: AcademicCycleActionState = { status: "idle", message: "" };

export function AcademicCycleForm() {
  const [state, action, pending] = useActionState(
    createAcademicCycleAction,
    initialState,
  );

  return (
    <form action={action} className="grid gap-4 border-y border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-6 sm:grid-cols-3 sm:px-6">
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
        <select name="term" className="field">
          <option value="FIRST">1학기</option>
          <option value="SECOND">2학기</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="button-primary self-end"
      >
        {pending ? "등록 중" : "학기 등록"}
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`sm:col-span-3 ${state.status === "error" ? "text-red-700" : "text-green-700"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
