"use client";

import { UiButton, UiDiv, UiInput, UiNav, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import type { TopicSummary } from "@/modules/topic/application/topic-ports";
import { CustomSelect } from "@/shared/ui/custom-select";

export type TopicFormActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

type TopicFormAction = (
  previousState: TopicFormActionState,
  formData: FormData,
) => Promise<TopicFormActionState>;

const initialState: TopicFormActionState = { status: "idle", message: "" };
const programDate = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

type TopicFormProps = {
  action: TopicFormAction;
  programs: ProjectProgramRecord[];
  defaultProgramId?: string;
  successHref?: string;
  studentApproval?: {
    professors: Array<{ id: string; name: string; email: string }>;
    studentTeams: Array<{ id: string; name: string; memberCount: number }>;
  };
  initialTopic?: TopicSummary;
};

type TopicFormQuestion = {
  localId: number;
  label: string;
  maxLength: number;
  required: boolean;
};

const periodFields = [
  ["모집 시작", "recruitmentStartsAt"],
  ["모집 종료", "recruitmentEndsAt"],
  ["수행 시작", "executionStartsAt"],
  ["수행 종료", "executionEndsAt"],
  ["제출 시작", "submissionStartsAt"],
  ["제출 종료", "submissionEndsAt"],
] as const;

function FormSectionHeading({ number, title, description }: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--primary-subtle)] text-xs font-black text-[var(--primary-hover)]">{number}</span>
      <div>
        <h2 className="text-lg font-black tracking-[-0.025em]"><UiText>{title}</UiText></h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p>
      </div>
    </div>
  );
}

function koreanDateTimeLocal(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export function TopicForm({ action: createTopic, programs, defaultProgramId, successHref, studentApproval, initialTopic }: TopicFormProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createTopic, initialState);
  const initialQuestions: TopicFormQuestion[] = initialTopic?.applicationQuestions.map((question, index) => ({
    localId: index + 1,
    label: question.label,
    maxLength: question.maxLength,
    required: question.required,
  })) ?? [{ localId: 1, label: "", maxLength: 500, required: true }];
  const nextQuestionId = useRef(initialQuestions.length + 1);
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedProgramId, setSelectedProgramId] = useState(initialTopic?.programId ?? defaultProgramId ?? "");
  const [approvalRoute, setApprovalRoute] = useState<"PROFESSOR" | "ADMIN">("PROFESSOR");
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);
  const advisorEnabled = selectedProgram?.advisorEnabled;
  const formSections = [
    ["topic-basic", "기본 정보"],
    ["topic-requirements", "지원 조건"],
    ["topic-application", "지원 방식과 문항"],
    ["topic-schedule", "정원과 기간"],
    ...(studentApproval ? [["topic-approval", "참여 팀과 승인"]] : []),
  ] as const;
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  return (
    <form action={action} aria-busy={pending} className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[13rem_minmax(0,1fr)] xl:items-start">
      {initialTopic ? <input type="hidden" name="topicId" value={initialTopic.id} /> : null}
      <UiNav aria-label="주제 작성 섹션" className="min-w-0 overflow-x-auto rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-3 xl:sticky xl:top-6 xl:overflow-visible">
        <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--primary)]"><UiText>{"작성 순서"}</UiText></p>
        <ol className="flex min-w-max gap-1 xl:grid xl:min-w-0">
          {formSections.map(([id, label], index) => (
            <li key={id}>
              <a href={`#${id}`} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[var(--muted)] transition-colors hover:bg-white hover:text-[var(--ink)] focus-visible:bg-white">
                <span className="text-xs font-black text-[var(--primary)]">{String(index + 1).padStart(2, "0")}</span>
                <UiText>{label}</UiText>
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-3 hidden border-t border-[var(--line)] px-2 pt-3 text-xs leading-5 text-[var(--muted)] xl:block"><UiText>{"각 섹션을 차례로 작성한 뒤 하단에서 저장합니다."}</UiText></p>
      </UiNav>

      <div className="min-w-0 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white">
      <section id="topic-basic" className="scroll-mt-6 grid gap-5 px-5 py-7 sm:px-7">
      <FormSectionHeading number="01" title="기본 정보" description="학생이 목록과 상세에서 가장 먼저 확인하는 내용입니다." />
      {initialTopic ? <label className="grid gap-2 text-sm font-medium">
        <UiText>{"프로그램"}</UiText>
        <input type="hidden" name="programId" value={initialTopic.programId} />
        <span className="field bg-[var(--surface-subtle)]">{initialTopic.programName}</span>
      </label> : <label className="grid gap-2 text-sm font-medium">
        <UiText>{"프로그램"}</UiText><CustomSelect
          name="programId"
          ariaLabel="프로그램"
          required
          defaultValue={defaultProgramId}
          placeholder="프로그램을 선택하세요"
          onValueChange={(value) => {
            setSelectedProgramId(value);
            if (!programs.find(({ id }) => id === value)?.advisorEnabled) setApprovalRoute("ADMIN");
          }}
          options={programs.map((program) => ({
            value: program.id,
            label: program.name,
            description: `${programDate.format(program.startsAt)} – ${programDate.format(program.endsAt)}`,
          }))}
        />
      </label>}
      <label className="grid gap-2 text-sm font-medium">
        <UiText>{"주제명"}</UiText><input name="title" defaultValue={initialTopic?.title} maxLength={200} required className="field" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        <UiText>{"설명"}</UiText><textarea name="description" defaultValue={initialTopic?.description} maxLength={10000} required rows={6} className="field" />
      </label>
      </section>
      <section id="topic-requirements" className="scroll-mt-6 grid gap-4 border-t border-[var(--line)] px-5 py-7 sm:grid-cols-2 sm:px-7">
        <div className="sm:col-span-2"><FormSectionHeading number="02" title="지원 조건" description="선발 판단에 실제로 필요한 기술과 참여 조건을 적습니다." /></div>
        <label className="grid gap-2 text-sm font-medium"><UiText>{"필수 기술"}</UiText><UiInput name="requiredSkills" defaultValue={initialTopic?.requiredSkills.join(", ")} maxLength={1000} required className="field" placeholder="예: TypeScript, Python" /><span className="muted text-xs"><UiText>{"쉼표로 구분해 입력합니다."}</UiText></span></label>
        <label className="grid gap-2 text-sm font-medium"><UiText>{"우대 기술"}</UiText><UiInput name="preferredSkills" defaultValue={initialTopic?.preferredSkills.join(", ")} maxLength={1000} className="field" placeholder="예: Docker, Figma" /><span className="muted text-xs"><UiText>{"없으면 비워둘 수 있습니다."}</UiText></span></label>
        <label className="grid gap-2 text-sm font-medium"><UiText>{"기대 역할"}</UiText><UiTextarea name="roleExpectations" defaultValue={initialTopic?.roleExpectations} maxLength={500} required rows={3} className="field" placeholder="예: 프론트엔드 구현과 사용자 테스트" /></label>
        <label className="grid gap-2 text-sm font-medium"><UiText>{"활동 가능 시간 조건"}</UiText><UiTextarea name="availabilityRequirement" defaultValue={initialTopic?.availabilityRequirement} maxLength={500} required rows={3} className="field" placeholder="예: 매주 수요일 18시 정기 회의 참여" /></label>
      </section>
      <section id="topic-application" className="scroll-mt-6 grid gap-5 border-t border-[var(--line)] px-5 py-7 sm:px-7">
        <FormSectionHeading number="03" title="지원 방식과 지원서" description="지원 단위와 검토에 사용할 질문을 함께 설정합니다." />
        <UiDiv className="divide-y divide-[var(--line)] border-y border-[var(--line)]" role="radiogroup" aria-label="프로젝트 지원 방식">
          {[
            ["INDIVIDUAL_ONLY", "개인 지원만", "학생이 혼자 지원합니다."],
            ["TEAM_ONLY", "팀 지원만", "팀장이 구성된 지속형 팀으로 지원합니다."],
            ["INDIVIDUAL_OR_TEAM", "개인·팀 모두", "학생이 개인 또는 지속형 팀 지원을 선택합니다."],
          ].map(([value, label, description], index) => <label key={value} className="grid cursor-pointer gap-2 px-1 py-4 has-[:checked]:border-l-2 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-subtle)] has-[:checked]:pl-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center"><span className="flex items-center gap-3"><input type="radio" name="applicationMode" value={value} defaultChecked={initialTopic ? initialTopic.applicationMode === value : index === 0} required /><strong><UiText>{label}</UiText></strong></span><span className="muted text-sm leading-6"><UiText>{description}</UiText></span></label>)}
        </UiDiv>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="font-semibold"><UiText>{"지원서 문항"}</UiText></h2><p className="muted mt-1 text-sm"><UiText>{"프로젝트에 꼭 필요한 질문만 직접 구성하세요."}</UiText></p></div>
          <button type="button" className="button-secondary" onClick={() => setQuestions((current) => [...current, { localId: nextQuestionId.current++, label: "", maxLength: 500, required: true }])} disabled={questions.length >= 20}><UiText>{"문항 추가"}</UiText></button>
        </div>
        <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {questions.map((question, index) => <li key={question.localId} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-medium"><UiText>{"문항"}</UiText>{" "}{index + 1}<UiInput name="questionLabel" defaultValue={question.label} maxLength={200} required className="field" placeholder="예: 이 프로젝트에서 해결하고 싶은 문제는 무엇인가요?" /></label>
            <label className="grid gap-2 text-sm font-medium"><UiText>{"글자 수 제한"}</UiText><input name="questionMaxLength" type="number" min="1" max="5000" defaultValue={question.maxLength} required className="field" /></label>
            <label className="grid gap-2 text-sm font-medium"><UiText>{"응답 조건"}</UiText><CustomSelect name="questionRequired" ariaLabel={`문항 ${index + 1} 응답 조건`} defaultValue={String(question.required)} options={[{ value: "true", label: "필수" }, { value: "false", label: "선택" }]} /></label>
            <UiButton type="button" className="button-quiet" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter(({ localId }) => localId !== question.localId))} aria-label={`문항 ${index + 1} 삭제`}><UiText>{"삭제"}</UiText></UiButton>
          </li>)}
        </ol>
        <p className="muted text-sm"><UiText>{"문항은 최대 20개, 문항별 답변은 최대 5,000자로 설정할 수 있습니다."}</UiText></p>
      </section>
      <section id="topic-schedule" className="scroll-mt-6 grid gap-6 border-t border-[var(--line)] px-5 py-7 sm:px-7"><FormSectionHeading number="04" title="정원과 운영 기간" description="모집 규모와 프로젝트 진행 일정을 정합니다." /><label className="grid gap-2 text-sm font-medium sm:max-w-xs">
        <UiText>{"모집 인원"}</UiText><input name="capacity" type="number" min="1" max="100" defaultValue={initialTopic?.capacity ?? 4} required className="field" />
      </label>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-semibold"><UiText>{"기간 설정"}</UiText></legend>
        {periodFields.map(([label, name]) => (
          <label key={name} className="grid gap-2 text-sm font-medium">
            <UiText>{label}</UiText>
            <input name={name} type="datetime-local" defaultValue={initialTopic ? koreanDateTimeLocal(initialTopic[name]) : undefined} required className="field" />
          </label>
        ))}
      </fieldset>
      <p className="muted text-sm"><UiText>{"모집·수행·제출 기간은 서로 겹칠 수 있습니다."}</UiText></p>
      </section>
      {studentApproval ? <section id="topic-approval" className="scroll-mt-6 grid gap-5 border-t border-[var(--line)] px-5 py-7 sm:px-7">
        <FormSectionHeading number="05" title="참여 팀과 승인" description="기존 팀 참여 여부와 프로젝트 공개 전 승인 경로를 정합니다." />
        <p className="text-sm leading-6 text-[var(--muted)]"><UiText>{"기존 팀을 선택하면 현재 팀원 전원이 승인과 동시에 참여하며 추가 모집은 받지 않습니다."}</UiText></p>
        <label className="grid gap-2 text-sm font-medium"><UiText>{"기존 팀 (선택)"}</UiText><CustomSelect name="studentTeamId" ariaLabel="기존 팀 (선택)" placeholder="선택하지 않고 새 팀원 모집" options={[{ value: "", label: "선택하지 않고 새 팀원 모집" }, ...studentApproval.studentTeams.map((team) => ({ value: team.id, label: team.name, description: `${team.memberCount}명 · 추가 모집 없음` }))]} /></label>
        <div><h2 className="text-base font-semibold"><UiText>{"승인 요청"}</UiText></h2><p className="muted mt-1 text-sm"><UiText>{advisorEnabled === false ? "지도교수가 없는 프로그램이므로 관리자 그룹에 검토를 요청합니다." : "지정 교수 한 명 또는 관리자 그룹에 검토를 요청합니다."}</UiText></p></div>
        {advisorEnabled === false ? (
          <input type="hidden" name="approvalRoute" value="ADMIN" />
        ) : advisorEnabled === true ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer gap-3 rounded-[var(--radius-control)] border border-[var(--line)] p-4 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-subtle)]"><input type="radio" name="approvalRoute" value="PROFESSOR" checked={approvalRoute === "PROFESSOR"} onChange={() => setApprovalRoute("PROFESSOR")} /><span><strong className="block"><UiText>{"교수에게 요청"}</UiText></strong><span className="mt-1 block text-sm text-[var(--muted)]"><UiText>{"검토할 교수를 반드시 지정합니다."}</UiText></span></span></label>
              <label className="flex cursor-pointer gap-3 rounded-[var(--radius-control)] border border-[var(--line)] p-4 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-subtle)]"><input type="radio" name="approvalRoute" value="ADMIN" checked={approvalRoute === "ADMIN"} onChange={() => setApprovalRoute("ADMIN")} /><span><strong className="block"><UiText>{"관리자에게 요청"}</UiText></strong><span className="mt-1 block text-sm text-[var(--muted)]"><UiText>{"특정 관리자를 지정하지 않습니다."}</UiText></span></span></label>
            </div>
            {approvalRoute === "PROFESSOR" ? <label className="grid gap-2 text-sm font-medium"><UiText>{"승인 교수"}</UiText><CustomSelect name="requestedProfessorId" ariaLabel="승인 교수" required placeholder="교수를 선택하세요" options={studentApproval.professors.map((professor) => ({ value: professor.id, label: professor.name, description: professor.email }))} /></label> : null}
          </>
        ) : (
          <p className="muted text-sm"><UiText>{"프로그램을 선택하면 승인 요청 방식이 표시됩니다."}</UiText></p>
        )}
      </section> : null}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 rounded-b-[var(--radius-panel)] border-t border-[var(--line-strong)] bg-white/95 px-5 py-4 shadow-[0_-10px_30px_rgba(31,35,48,0.07)] backdrop-blur sm:px-7">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]"><UiText>{studentApproval ? "승인 전까지 공개되지 않습니다." : "저장 후 목록에서 공개할 수 있습니다."}</UiText></p>
          {state.message ? (
            <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`mt-1 text-sm font-bold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              <UiText>{state.message}</UiText>
            </p>
          ) : null}
        </div>
        <button type="submit" disabled={pending || (!initialTopic && programs.length === 0)} className="button-primary max-sm:w-full">
          <UiText>{pending ? "저장 중" : initialTopic ? "변경 저장" : studentApproval ? "승인 요청 보내기" : "초안 저장"}</UiText>
        </button>
      </div>
      </div>
    </form>
  );
}
