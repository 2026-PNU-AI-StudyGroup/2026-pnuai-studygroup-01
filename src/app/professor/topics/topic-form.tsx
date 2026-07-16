"use client";

import { useActionState } from "react";

import {
  createTopicAction,
  type CreateTopicActionState,
} from "@/app/professor/topics/actions";
import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";

const initialState: CreateTopicActionState = { status: "idle", message: "" };

type TopicFormProps = {
  programs: ProjectProgramRecord[];
};

const periodFields = [
  ["모집 시작", "recruitmentStartsAt"],
  ["모집 종료", "recruitmentEndsAt"],
  ["수행 시작", "executionStartsAt"],
  ["수행 종료", "executionEndsAt"],
  ["제출 시작", "submissionStartsAt"],
  ["제출 종료", "submissionEndsAt"],
] as const;

export function TopicForm({ programs }: TopicFormProps) {
  const [state, action, pending] = useActionState(createTopicAction, initialState);

  return (
    <form action={action} className="grid gap-6 border-y border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-6 sm:px-6">
      <label className="grid gap-2 text-sm font-medium">
        프로젝트 프로그램
        <select name="programId" required className="field">
          <option value="">프로그램을 선택하세요</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name} · {program.academicYear}학년도 {program.term === "FIRST" ? "1" : "2"}학기
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
      <fieldset className="grid gap-4 border-y border-[var(--line)] py-5 sm:grid-cols-2">
        <legend className="mb-3 font-semibold">지원 조건</legend>
        <label className="grid gap-2 text-sm font-medium">필수 기술<input name="requiredSkills" maxLength={1000} required className="field" placeholder="예: TypeScript, Python" /><span className="muted text-xs">쉼표로 구분해 입력합니다.</span></label>
        <label className="grid gap-2 text-sm font-medium">우대 기술<input name="preferredSkills" maxLength={1000} className="field" placeholder="예: Docker, Figma" /><span className="muted text-xs">없으면 비워둘 수 있습니다.</span></label>
        <label className="grid gap-2 text-sm font-medium">기대 역할<textarea name="roleExpectations" maxLength={500} required rows={3} className="field" placeholder="예: 프론트엔드 구현과 사용자 테스트" /></label>
        <label className="grid gap-2 text-sm font-medium">활동 가능 시간 조건<textarea name="availabilityRequirement" maxLength={500} required rows={3} className="field" placeholder="예: 매주 수요일 18시 정기 회의 참여" /></label>
      </fieldset>
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
      <p className="muted text-sm">모집·수행·제출 기간은 서로 겹칠 수 있습니다.</p>
      <button type="submit" disabled={pending || programs.length === 0} className="button-primary justify-self-start">
        {pending ? "저장 중" : "초안 저장"}
      </button>
      {state.message ? (
        <p aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
