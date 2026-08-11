"use client";

import { UiInput, UiNav, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import type { TopicSummary } from "@/modules/topic/application/topic-ports";
import { CustomSelect } from "@/shared/ui/custom-select";
import { ChoiceCard, FormField, FormSection, TextInput, Textarea } from "@/shared/ui/form-system";
import { IconButton } from "@/shared/ui/icon-button";
import { TagInput } from "@/shared/ui/tag-input";
import { TrashIcon } from "@/shared/ui/workspace-icons";

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
  const [selectedDivisionId, setSelectedDivisionId] = useState(initialTopic?.divisionId ?? "");
  const [approvalRoute, setApprovalRoute] = useState<"PROFESSOR" | "ADMIN">("PROFESSOR");
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);
  const advisorEnabled = selectedProgram?.advisorEnabled;
  const formSections = [
    ["topic-basic", "기본 정보"],
    ["topic-requirements", "지원 조건"],
    ["topic-application", "지원 방식과 문항"],
    ["topic-schedule", "모집 설정"],
    ...(studentApproval ? [["topic-approval", "참여 팀과 승인"]] : []),
  ] as const;
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  return (
    <form action={action} aria-busy={pending} className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[13rem_minmax(0,1fr)] xl:items-start">
      {initialTopic ? <input type="hidden" name="topicId" value={initialTopic.id} /> : null}
      <UiNav aria-label="프로젝트 작성 섹션" className="min-w-0 overflow-x-auto rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-3 xl:sticky xl:top-6 xl:overflow-visible">
        <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--primary)]"><UiText>{"작성 순서"}</UiText></p>
        <ol className="flex min-w-max gap-1 xl:grid xl:min-w-0">
          {formSections.map(([id, label], index) => (
            <li key={id}>
              <a href={`#${id}`} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[var(--muted)] transition-colors hover:bg-white hover:text-[var(--ink)] focus-visible:bg-white">
                <span className="text-xs font-bold text-[var(--primary)]">{String(index + 1).padStart(2, "0")}</span>
                <UiText>{label}</UiText>
              </a>
            </li>
          ))}
        </ol>
      </UiNav>

      <div className="min-w-0 grid gap-4">
      <FormSection id="topic-basic" number="01" title="기본 정보" description="학생에게 공개되는 제목과 설명입니다.">
      {initialTopic ? <FormField label="프로그램">
          <input type="hidden" name="programId" value={initialTopic.programId} />
          <span className="form-static-value">{initialTopic.programName}</span>
          <span className="mt-1 block text-sm text-[var(--muted)]"><UiText>{initialTopic.divisionName ? `분과 · ${initialTopic.divisionName}` : "미분과"}</UiText></span>
        </FormField> : <FormField id="topic-program" label="프로그램">
          <CustomSelect
            id="topic-program"
            name="programId"
            ariaLabel="프로그램"
            required
            searchable
            defaultValue={defaultProgramId}
            placeholder="프로그램을 선택하세요"
            onValueChange={(value) => {
              setSelectedProgramId(value);
              setSelectedDivisionId("");
              if (!programs.find(({ id }) => id === value)?.advisorEnabled) setApprovalRoute("ADMIN");
            }}
            options={programs.map((program) => ({
              value: program.id,
              label: program.name,
              description: `${programDate.format(program.startsAt)} – ${programDate.format(program.endsAt)}`,
            }))}
          />
        </FormField>}
        {!initialTopic && selectedProgram?.divisions?.length ? <FormField id="topic-division" label="분과" description="프로젝트 하나는 하나의 분과에 속합니다.">
          <CustomSelect id="topic-division" name="divisionId" ariaLabel="분과" required invalidMessage="분과를 선택하세요" value={selectedDivisionId} onValueChange={setSelectedDivisionId} placeholder="분과를 선택하세요" options={selectedProgram.divisions.map((division) => ({ value: division.id, label: division.name }))} />
        </FormField> : null}
        <FormField id="topic-title" label="프로젝트명">
          <TextInput id="topic-title" name="title" defaultValue={initialTopic?.title} maxLength={200} required />
        </FormField>
        <FormField id="topic-description" label="설명">
          <Textarea id="topic-description" name="description" defaultValue={initialTopic?.description} maxLength={10000} required rows={6} />
        </FormField>
      </FormSection>
      <FormSection id="topic-requirements" number="02" title="지원 조건" description="선발 판단에 실제로 필요한 기술과 참여 조건을 적습니다." contentClassName="sm:grid-cols-2">
        <FormField id="topic-required-skills" label="필수 기술" description="항목을 입력하고 Enter를 누르세요.">
          <TagInput id="topic-required-skills" name="requiredSkills" ariaLabel="필수 기술" defaultValue={initialTopic?.requiredSkills} maxLength={1000} required placeholder="TypeScript, Python" />
        </FormField>
        <FormField id="topic-preferred-skills" label="우대 기술" description="없으면 비워둘 수 있습니다." optional>
          <TagInput id="topic-preferred-skills" name="preferredSkills" ariaLabel="우대 기술" defaultValue={initialTopic?.preferredSkills} maxLength={1000} placeholder="Docker, Figma" />
        </FormField>
        <FormField id="topic-role-expectations" label="예상 역할">
          <UiTextarea id="topic-role-expectations" name="roleExpectations" defaultValue={initialTopic?.roleExpectations} maxLength={500} required rows={3} className="form-control" placeholder="예: 프론트엔드 구현과 사용자 테스트" />
        </FormField>
        <FormField id="topic-availability" label="활동 가능 시간 조건">
          <UiTextarea id="topic-availability" name="availabilityRequirement" defaultValue={initialTopic?.availabilityRequirement} maxLength={500} required rows={3} className="form-control" placeholder="예: 매주 수요일 18시 정기 회의 참여" />
        </FormField>
      </FormSection>
      <FormSection id="topic-application" number="03" title="지원 방식과 지원서">
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="sr-only"><UiText>{"프로젝트 지원 방식"}</UiText></legend>
          {[
            ["INDIVIDUAL_ONLY", "개인 지원만", "학생이 혼자 지원합니다."],
            ["TEAM_ONLY", "팀 지원만", "학생이 팀장인 팀으로 지원합니다."],
            ["INDIVIDUAL_OR_TEAM", "개인·팀 모두", "학생이 개인 지원 또는 팀 지원을 선택합니다."],
          ].map(([value, label, description], index) => <ChoiceCard key={value} name="applicationMode" value={value} defaultChecked={initialTopic ? initialTopic.applicationMode === value : index === 0} required label={label} description={description} />)}
        </fieldset>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="font-semibold"><UiText>{"지원서 문항"}</UiText></h2><p className="muted mt-1 text-sm"><UiText>{"프로젝트에 꼭 필요한 질문만 직접 구성하세요."}</UiText></p></div>
          <button type="button" className="button-secondary" onClick={() => setQuestions((current) => [...current, { localId: nextQuestionId.current++, label: "", maxLength: 500, required: true }])} disabled={questions.length >= 20}><UiText>{"문항 추가"}</UiText></button>
        </div>
        <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {questions.map((question, index) => <li key={question.localId} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_auto] sm:items-end">
            <label className="grid gap-2 text-sm font-medium"><UiText>{"문항"}</UiText>{" "}{index + 1}<UiInput name="questionLabel" defaultValue={question.label} maxLength={200} required className="form-control" placeholder="예: 이 프로젝트에서 해결하고 싶은 문제는 무엇인가요?" /></label>
            <label className="grid gap-2 text-sm font-medium"><UiText>{"글자 수 제한"}</UiText><TextInput name="questionMaxLength" type="number" min="1" max="5000" defaultValue={question.maxLength} required /></label>
            <label className="grid gap-2 text-sm font-medium"><UiText>{"응답 조건"}</UiText><CustomSelect name="questionRequired" ariaLabel={`문항 ${index + 1} 응답 조건`} density="compact" defaultValue={String(question.required)} options={[{ value: "true", label: "필수" }, { value: "false", label: "선택" }]} /></label>
            <IconButton type="button" className="text-[var(--danger)] hover:text-[var(--danger)]" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter(({ localId }) => localId !== question.localId))} aria-label={`문항 ${index + 1} 삭제`} title={`문항 ${index + 1} 삭제`}><TrashIcon className="size-5" /></IconButton>
          </li>)}
        </ol>
        <p className="muted text-sm"><UiText>{"문항은 최대 20개, 문항별 답변은 최대 5,000자로 설정할 수 있습니다."}</UiText></p>
      </FormSection>
      <FormSection id="topic-schedule" number="04" title="모집 설정" description="일정은 프로그램 공통 일정으로 적용됩니다."><label className="grid gap-2 text-sm font-medium sm:max-w-xs">
        <UiText>{"모집 인원"}</UiText><TextInput name="capacity" type="number" min="1" max="100" defaultValue={initialTopic?.capacity ?? 4} required />
      </label>
      <p className="muted text-sm"><UiText>{selectedProgram ? `이 프로그램의 모집은 ${programDate.format(selectedProgram.recruitmentStartsAt)}부터 ${programDate.format(selectedProgram.recruitmentEndsAt)}까지입니다.` : "프로그램을 선택하면 공통 모집 일정이 표시됩니다."}</UiText></p>
      </FormSection>
      {studentApproval ? <FormSection id="topic-approval" number="05" title="참여 팀과 승인" description="기존 팀 참여 여부와 프로젝트 공개 전 승인 경로를 정합니다.">
        <p className="text-sm leading-6 text-[var(--muted)]"><UiText>{"기존 팀을 선택하면 현재 팀원 전원이 승인과 동시에 참여하며 추가 모집은 받지 않습니다."}</UiText></p>
        <FormField id="topic-student-team" label="기존 팀" description="선택하면 현재 팀원 전원이 참여하고 추가 모집은 받지 않습니다." optional>
          <CustomSelect id="topic-student-team" name="studentTeamId" ariaLabel="기존 팀 (선택)" placeholder="선택하지 않고 새 팀원 모집" options={[{ value: "", label: "선택하지 않고 새 팀원 모집" }, ...studentApproval.studentTeams.map((team) => ({ value: team.id, label: team.name, description: `${team.memberCount}명 · 추가 모집 없음` }))]} />
        </FormField>
        <div><h2 className="text-base font-semibold"><UiText>{"검토 요청"}</UiText></h2><p className="muted mt-1 text-sm"><UiText>{advisorEnabled === false ? "지도교수가 없는 프로그램이므로 관리자에게 검토를 요청합니다." : "교수 한 명 또는 관리자에게 검토를 요청합니다."}</UiText></p></div>
        {advisorEnabled === false ? (
          <input type="hidden" name="approvalRoute" value="ADMIN" />
        ) : advisorEnabled === true ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard name="approvalRoute" value="PROFESSOR" checked={approvalRoute === "PROFESSOR"} onChange={() => setApprovalRoute("PROFESSOR")} label="교수에게 요청" description="검토할 교수를 반드시 지정합니다." />
              <ChoiceCard name="approvalRoute" value="ADMIN" checked={approvalRoute === "ADMIN"} onChange={() => setApprovalRoute("ADMIN")} label="관리자에게 요청" description="특정 관리자를 지정하지 않습니다." />
            </div>
            {approvalRoute === "PROFESSOR" ? <FormField id="topic-professor" label="검토 요청 교수"><CustomSelect id="topic-professor" name="requestedProfessorId" ariaLabel="검토 요청 교수" required searchable placeholder="교수를 검색하거나 선택하세요" options={studentApproval.professors.map((professor) => ({ value: professor.id, label: professor.name, description: professor.email }))} /></FormField> : null}
          </>
        ) : (
          <p className="muted text-sm"><UiText>{"프로그램을 선택하면 승인 요청 방식이 표시됩니다."}</UiText></p>
        )}
      </FormSection> : null}
      <div className="form-action-bar sticky bottom-3 z-10 bg-white/95 shadow-[0_12px_40px_rgba(31,35,48,0.12)] backdrop-blur">
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
