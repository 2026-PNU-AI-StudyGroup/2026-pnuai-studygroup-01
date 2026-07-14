"use client";

import { useActionState } from "react";

import {
  createTopicAction,
  type CreateTopicActionState,
} from "@/app/professor/topics/actions";
import type { AcademicCycleRecord } from "@/modules/academic-cycle/application/academic-cycle-ports";

const initialState: CreateTopicActionState = { status: "idle", message: "" };

type TopicFormProps = {
  cycles: AcademicCycleRecord[];
};

const periodFields = [
  ["모집 시작", "recruitmentStartsAt"],
  ["모집 종료", "recruitmentEndsAt"],
  ["수행 시작", "executionStartsAt"],
  ["수행 종료", "executionEndsAt"],
  ["제출 시작", "submissionStartsAt"],
  ["제출 종료", "submissionEndsAt"],
] as const;

export function TopicForm({ cycles }: TopicFormProps) {
  const [state, action, pending] = useActionState(createTopicAction, initialState);

  return (
    <form action={action} className="grid gap-6 border-y border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-6 sm:px-6">
      <label className="grid gap-2 text-sm font-medium">
        학기
        <select name="academicCycleId" required className="field">
          <option value="">학기를 선택하세요</option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.academicYear}학년도 {cycle.term === "FIRST" ? "1" : "2"}학기
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        주제명
        <input name="title" maxLength={200} required className="field" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        설명
        <textarea name="description" maxLength={10000} required rows={6} className="field" />
      </label>
      <label className="grid gap-2 text-sm font-medium sm:max-w-xs">
        모집 인원
        <input name="capacity" type="number" min="1" max="100" defaultValue="4" required className="field" />
      </label>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">기간 설정</legend>
        {periodFields.map(([label, name]) => (
          <label key={name} className="grid gap-2 text-sm font-medium">
            {label}
            <input name={name} type="datetime-local" required className="field" />
          </label>
        ))}
      </fieldset>
      <p className="text-sm text-zinc-600">모집·수행·제출 기간은 서로 겹칠 수 있습니다.</p>
      <button type="submit" disabled={pending || cycles.length === 0} className="button-primary justify-self-start">
        {pending ? "저장 중" : "초안 저장"}
      </button>
      {state.message ? (
        <p aria-live="polite" className={state.status === "error" ? "text-red-700" : "text-green-700"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
