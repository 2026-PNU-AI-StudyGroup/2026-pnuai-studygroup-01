"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import {
  createTopicAction,
  type CreateTopicActionState,
} from "@/app/professor/topics/_actions/topic-management-actions";
import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";

const initialState: CreateTopicActionState = { status: "idle", message: "" };

type TopicFormProps = {
  programs: ProjectProgramRecord[];
  successHref?: string;
};

const periodFields = [
  ["모집 시작", "recruitmentStartsAt"],
  ["모집 종료", "recruitmentEndsAt"],
  ["수행 시작", "executionStartsAt"],
  ["수행 종료", "executionEndsAt"],
  ["제출 시작", "submissionStartsAt"],
  ["제출 종료", "submissionEndsAt"],
] as const;

export function TopicForm({ programs, successHref }: TopicFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createTopicAction, initialState);
  const nextQuestionId = useRef(2);
  const [questions, setQuestions] = useState([{ id: 1 }]);
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  return (
    <form action={action} aria-busy={pending} className="grid gap-10">
      <section className="grid gap-5 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-5 sm:p-6">
      <div><p className="text-xs font-extrabold text-[var(--primary)]">01</p><h2 className="mt-1 text-xl font-extrabold">기본 정보</h2></div>
      <label className="grid gap-2 text-sm font-medium">
        프로그램
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
      </section>
      <section className="grid gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2"><span className="block text-xs font-extrabold text-[var(--primary)]">02</span><h2 className="mt-1 text-xl font-extrabold">지원 조건</h2></div>
        <label className="grid gap-2 text-sm font-medium">필수 기술<input name="requiredSkills" maxLength={1000} required className="field" placeholder="예: TypeScript, Python" /><span className="muted text-xs">쉼표로 구분해 입력합니다.</span></label>
        <label className="grid gap-2 text-sm font-medium">우대 기술<input name="preferredSkills" maxLength={1000} className="field" placeholder="예: Docker, Figma" /><span className="muted text-xs">없으면 비워둘 수 있습니다.</span></label>
        <label className="grid gap-2 text-sm font-medium">기대 역할<textarea name="roleExpectations" maxLength={500} required rows={3} className="field" placeholder="예: 프론트엔드 구현과 사용자 테스트" /></label>
        <label className="grid gap-2 text-sm font-medium">활동 가능 시간 조건<textarea name="availabilityRequirement" maxLength={500} required rows={3} className="field" placeholder="예: 매주 수요일 18시 정기 회의 참여" /></label>
      </section>
      <section className="grid gap-5 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-5 sm:p-6">
        <div><span className="block text-xs font-extrabold text-[var(--primary)]">03</span><h2 className="mt-1 text-xl font-extrabold">지원 방식과 지원서</h2></div>
        <div className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-control)] border border-[var(--line)] bg-white" role="radiogroup" aria-label="프로젝트 지원 방식">
          {[
            ["INDIVIDUAL_ONLY", "개인 지원만", "학생이 혼자 지원합니다."],
            ["TEAM_ONLY", "팀 지원만", "초대된 팀원이 모두 수락해야 접수됩니다."],
            ["INDIVIDUAL_OR_TEAM", "개인·팀 모두", "학생이 개인 또는 팀 지원을 선택합니다."],
          ].map(([value, label, description], index) => <label key={value} className="grid cursor-pointer gap-2 px-1 py-4 has-[:checked]:border-l-2 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-subtle)] has-[:checked]:pl-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center"><span className="flex items-center gap-3"><input type="radio" name="applicationMode" value={value} defaultChecked={index === 0} required /><strong>{label}</strong></span><span className="muted text-sm leading-6">{description}</span></label>)}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="font-semibold">지원서 문항</h2><p className="muted mt-1 text-sm">프로젝트에 꼭 필요한 질문만 직접 구성하세요.</p></div>
          <button type="button" className="button-secondary" onClick={() => setQuestions((current) => [...current, { id: nextQuestionId.current++ }])} disabled={questions.length >= 20}>문항 추가</button>
        </div>
        <ol className="grid gap-4">
          {questions.map((question, index) => <li key={question.id} className="grid gap-4 rounded-[var(--radius-control)] border border-[var(--line)] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-medium">문항 {index + 1}<input name="questionLabel" maxLength={200} required className="field" placeholder="예: 이 프로젝트에서 해결하고 싶은 문제는 무엇인가요?" /></label>
            <label className="grid gap-2 text-sm font-medium">글자 수 제한<input name="questionMaxLength" type="number" min="1" max="5000" defaultValue="500" required className="field" /></label>
            <label className="grid gap-2 text-sm font-medium">응답 조건<select name="questionRequired" defaultValue="true" className="field"><option value="true">필수</option><option value="false">선택</option></select></label>
            <button type="button" className="button-quiet" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter(({ id }) => id !== question.id))} aria-label={`문항 ${index + 1} 삭제`}>삭제</button>
          </li>)}
        </ol>
        <p className="muted text-sm">문항은 최대 20개, 문항별 답변은 최대 5,000자로 설정할 수 있습니다.</p>
      </section>
      <section className="grid gap-6 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-5 sm:p-6"><div><p className="text-xs font-extrabold text-[var(--primary)]">04</p><h2 className="mt-1 text-xl font-extrabold">정원과 운영 기간</h2></div><label className="grid gap-2 text-sm font-medium sm:max-w-xs">
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
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5"><p className="muted text-sm">먼저 초안으로 저장하고, 준비가 되면 목록에서 공개하세요.</p><button type="submit" disabled={pending || programs.length === 0} className="button-primary">
        {pending ? "저장 중" : "초안 저장"}
      </button></div>
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
