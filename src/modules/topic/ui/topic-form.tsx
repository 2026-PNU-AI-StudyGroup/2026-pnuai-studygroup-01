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
  wizard?: { closeHref: string };
};

type TopicFormQuestion = {
  localId: number;
  label: string;
  maxLength: number;
  required: boolean;
};

type TopicWizardStep = "BASIC" | "REQUIREMENTS" | "APPLICATION" | "FINAL";

export function TopicForm({ action: createTopic, programs, defaultProgramId, successHref, studentApproval, initialTopic, wizard }: TopicFormProps) {
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
  const updateQuestion = (localId: number, changes: Partial<TopicFormQuestion>) => {
    setQuestions((current) =>
      current.map((q) => (q.localId === localId ? { ...q, ...changes } : q))
    );
  };
  const [title, setTitle] = useState(initialTopic?.title ?? "");
  const [description, setDescription] = useState(initialTopic?.description ?? "");
  const [roleExpectations, setRoleExpectations] = useState(initialTopic?.roleExpectations ?? "");
  const [availabilityRequirement, setAvailabilityRequirement] = useState(initialTopic?.availabilityRequirement ?? "");
  const [selectedProgramId, setSelectedProgramId] = useState(initialTopic?.programId ?? defaultProgramId ?? "");
  const [selectedDivisionId, setSelectedDivisionId] = useState(initialTopic?.divisionId ?? "");
  const [approvalRoute, setApprovalRoute] = useState<"PROFESSOR" | "ADMIN">("PROFESSOR");
  const [wizardStep, setWizardStep] = useState(0);
  const defaultRecruitmentEnabled = initialTopic?.recruitmentEnabled ?? !studentApproval;
  const [recruitmentEnabled, setRecruitmentEnabled] = useState(defaultRecruitmentEnabled);
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);
  const advisorEnabled = selectedProgram?.advisorEnabled;
  const wizardSteps: Array<{ id: TopicWizardStep; label: string }> = recruitmentEnabled
    ? [
        { id: "BASIC", label: "기본 정보" },
        { id: "REQUIREMENTS", label: "지원 조건" },
        { id: "APPLICATION", label: "지원서" },
        { id: "FINAL", label: "모집 및 승인" },
      ]
    : [
        { id: "BASIC", label: "기본 정보" },
        { id: "FINAL", label: "승인 요청" },
      ];
  const currentWizardStep = wizardSteps[Math.min(wizardStep, wizardSteps.length - 1)];
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "success" && successHref && !wizard) router.replace(successHref);
  }, [router, state.status, successHref, wizard]);

  function advanceWizard() {
    if (!currentWizardStep || !formRef.current) return;
    const sectionIds: Record<TopicWizardStep, string[]> = {
      BASIC: ["topic-basic"],
      REQUIREMENTS: ["topic-requirements"],
      APPLICATION: ["topic-application"],
      FINAL: ["topic-schedule", "topic-approval"],
    };
    const controls = sectionIds[currentWizardStep.id].flatMap((id) =>
      Array.from(formRef.current?.querySelectorAll<HTMLElement>(`#${id} input, #${id} textarea, #${id} select`) ?? []),
    );
    const invalid = controls.find((control) => "checkValidity" in control && !(control as HTMLInputElement).checkValidity());
    if (invalid) {
      (invalid as HTMLInputElement).reportValidity();
      invalid.focus();
      return;
    }
    setWizardStep((current) => Math.min(current + 1, wizardSteps.length - 1));
  }

  if (wizard && state.status === "success") {
    return (
      <div className="grid min-h-72 place-content-center gap-5 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--success-subtle)] text-2xl font-bold text-[var(--success)]">✓</div>
        <div>
          <h3 className="text-xl font-bold"><UiText>{"승인 요청을 보냈습니다"}</UiText></h3>
          <p className="mt-2 text-sm text-[var(--muted)]"><UiText>{"검토 상태는 내 승인 요청에서 확인할 수 있습니다."}</UiText></p>
        </div>
        <button type="button" className="button-primary mx-auto" onClick={() => router.replace(wizard.closeHref)}><UiText>{"완료"}</UiText></button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} noValidate={Boolean(wizard)} aria-busy={pending} className={`topic-form mx-auto grid max-w-4xl gap-4 ${wizard ? "topic-form--wizard" : ""}`}>
      {initialTopic ? <input type="hidden" name="topicId" value={initialTopic.id} /> : null}
      {wizard ? (
        <UiNav aria-label="프로젝트 제안 단계" className="border-b border-[var(--line)] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <strong className="text-sm"><UiText>{currentWizardStep.label}</UiText></strong>
            <span className="text-xs font-bold text-[var(--muted)]">{wizardStep + 1} / {wizardSteps.length}</span>
          </div>
          <ol className="mt-3 grid grid-flow-col gap-2" aria-hidden="true">
            {wizardSteps.map((step, index) => <li key={step.id} className={`h-1 rounded-full ${index <= wizardStep ? "bg-[var(--primary)]" : "bg-[var(--line)]"}`} />)}
          </ol>
        </UiNav>
      ) : null}
      <FormSection id="topic-basic" title="기본 정보" className={wizard && currentWizardStep.id !== "BASIC" ? "hidden" : ""}>
        <div className={`grid gap-4 ${!initialTopic && selectedProgram?.divisions?.length ? "sm:grid-cols-2" : ""}`}>
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
        {!initialTopic && selectedProgram?.divisions?.length ? <FormField id="topic-division" label="분과">
          <CustomSelect id="topic-division" name="divisionId" ariaLabel="분과" required invalidMessage="분과를 선택하세요" value={selectedDivisionId} onValueChange={setSelectedDivisionId} placeholder="분과를 선택하세요" options={selectedProgram.divisions.map((division) => ({ value: division.id, label: division.name }))} />
        </FormField> : null}
        </div>
        <FormField id="topic-title" label="프로젝트명">
          <TextInput id="topic-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </FormField>
        <FormField id="topic-description" label="설명">
          <Textarea id="topic-description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={10000} required rows={4} />
        </FormField>
        {studentApproval && !initialTopic ? (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold"><UiText>{"학생 지원"}</UiText></legend>
            <ChoiceCard name="recruitmentEnabled" value="false" checked={!recruitmentEnabled} onChange={() => setRecruitmentEnabled(false)} label="지원 안 받기" />
            <ChoiceCard name="recruitmentEnabled" value="true" checked={recruitmentEnabled} onChange={() => setRecruitmentEnabled(true)} label="지원 받기" />
          </fieldset>
        ) : <input type="hidden" name="recruitmentEnabled" value={String(defaultRecruitmentEnabled)} />}
      </FormSection>
      {recruitmentEnabled ? <>
      <FormSection id="topic-requirements" title="지원 조건" className={wizard && currentWizardStep.id !== "REQUIREMENTS" ? "hidden" : ""} contentClassName="sm:grid-cols-2">
        <FormField id="topic-required-skills" label="필수 기술">
          <TagInput id="topic-required-skills" name="requiredSkills" ariaLabel="필수 기술" defaultValue={initialTopic?.requiredSkills} maxLength={1000} required placeholder="TypeScript, Python" />
        </FormField>
        <FormField id="topic-preferred-skills" label="우대 기술" optional>
          <TagInput id="topic-preferred-skills" name="preferredSkills" ariaLabel="우대 기술" defaultValue={initialTopic?.preferredSkills} maxLength={1000} placeholder="Docker, Figma" />
        </FormField>
        <FormField id="topic-role-expectations" label="예상 역할">
          <UiTextarea id="topic-role-expectations" name="roleExpectations" value={roleExpectations} onChange={(e) => setRoleExpectations(e.target.value)} maxLength={500} required rows={3} className="form-control" placeholder="예: 프론트엔드 구현과 사용자 테스트" />
        </FormField>
        <FormField id="topic-availability" label="활동 가능 시간 조건">
          <UiTextarea id="topic-availability" name="availabilityRequirement" value={availabilityRequirement} onChange={(e) => setAvailabilityRequirement(e.target.value)} maxLength={500} required rows={3} className="form-control" placeholder="예: 매주 수요일 18시 정기 회의 참여" />
        </FormField>
      </FormSection>
      <FormSection id="topic-application" title="지원서" className={wizard && currentWizardStep.id !== "APPLICATION" ? "hidden" : ""}>
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="sr-only"><UiText>{"프로젝트 지원 방식"}</UiText></legend>
          {[
            ["INDIVIDUAL_ONLY", "개인만"],
            ["TEAM_ONLY", "팀만"],
            ["INDIVIDUAL_OR_TEAM", "개인·팀"],
          ].map(([value, label, description], index) => <ChoiceCard key={value} name="applicationMode" value={value} defaultChecked={initialTopic ? initialTopic.applicationMode === value : index === 0} required label={label} description={description} />)}
        </fieldset>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h3 className="font-semibold"><UiText>{"문항"}</UiText></h3>
          <button type="button" className="button-secondary" onClick={() => setQuestions((current) => [...current, { localId: nextQuestionId.current++, label: "", maxLength: 500, required: true }])} disabled={questions.length >= 20}><UiText>{"문항 추가"}</UiText></button>
        </div>
        <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {questions.map((question, index) => (
            <li key={question.localId} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_auto] sm:items-end">
              <label className="grid gap-2 text-sm font-medium">
                <UiText>{"문항"}</UiText>{" "}{index + 1}
                <UiInput
                  name="questionLabel"
                  value={question.label}
                  onChange={(e) => updateQuestion(question.localId, { label: e.target.value })}
                  maxLength={200}
                  required
                  className="form-control"
                  placeholder="예: 이 프로젝트에서 해결하고 싶은 문제는 무엇인가요?"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                <UiText>{"글자 수 제한"}</UiText>
                <TextInput
                  name="questionMaxLength"
                  type="number"
                  min="1"
                  max="5000"
                  value={question.maxLength}
                  onChange={(e) => updateQuestion(question.localId, { maxLength: Number(e.target.value) || 500 })}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                <UiText>{"응답 조건"}</UiText>
                <CustomSelect
                  name="questionRequired"
                  ariaLabel={`문항 ${index + 1} 응답 조건`}
                  density="compact"
                  value={String(question.required)}
                  onValueChange={(val) => updateQuestion(question.localId, { required: val === "true" })}
                  options={[
                    { value: "true", label: "필수" },
                    { value: "false", label: "선택" },
                  ]}
                />
              </label>
              <IconButton
                type="button"
                className="text-[var(--danger)] hover:text-[var(--danger)]"
                disabled={questions.length === 1}
                onClick={() => setQuestions((current) => current.filter(({ localId }) => localId !== question.localId))}
                aria-label={`문항 ${index + 1} 삭제`}
                title={`문항 ${index + 1} 삭제`}
              >
                <TrashIcon className="size-5" />
              </IconButton>
            </li>
          ))}
        </ol>
      </FormSection>
      <FormSection id="topic-schedule" title="모집" className={wizard && currentWizardStep.id !== "FINAL" ? "hidden" : ""} contentClassName="sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-end">
      <label className="grid gap-2 text-sm font-medium">
        <UiText>{"모집 인원"}</UiText><TextInput name="capacity" type="number" min="1" max="100" defaultValue={initialTopic?.capacity ?? 4} required />
      </label>
      <div className="rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-sm">
        <span className="block text-xs font-semibold text-[var(--muted)]"><UiText>{"모집 기간"}</UiText></span>
        <span className="mt-1 block font-semibold"><UiText>{selectedProgram ? `${programDate.format(selectedProgram.recruitmentStartsAt)} – ${programDate.format(selectedProgram.recruitmentEndsAt)}` : "프로그램을 선택하세요"}</UiText></span>
      </div>
      </FormSection>
      </> : null}
      {studentApproval ? <FormSection id="topic-approval" title="승인 요청" className={wizard && currentWizardStep.id !== "FINAL" ? "hidden" : ""}>
        <FormField id="topic-student-team" label="참여할 기존 팀" optional>
          <CustomSelect id="topic-student-team" name="studentTeamId" ariaLabel="참여할 기존 팀 (선택)" placeholder="기존 팀 없음" options={[{ value: "", label: "기존 팀 없음" }, ...studentApproval.studentTeams.map((team) => ({ value: team.id, label: team.name, description: `${team.memberCount}명` }))]} />
        </FormField>
        {advisorEnabled === false ? (
          <><input type="hidden" name="approvalRoute" value="ADMIN" /><p className="text-sm text-[var(--muted)]"><UiText>{"이 프로그램의 승인 요청은 관리자가 검토합니다."}</UiText></p></>
        ) : advisorEnabled === true ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard name="approvalRoute" value="PROFESSOR" checked={approvalRoute === "PROFESSOR"} onChange={() => setApprovalRoute("PROFESSOR")} label="교수 검토" />
              <ChoiceCard name="approvalRoute" value="ADMIN" checked={approvalRoute === "ADMIN"} onChange={() => setApprovalRoute("ADMIN")} label="관리자 검토" />
            </div>
            {approvalRoute === "PROFESSOR" ? <FormField id="topic-professor" label="검토 요청 교수"><CustomSelect id="topic-professor" name="requestedProfessorId" ariaLabel="검토 요청 교수" required searchable placeholder="교수를 검색하거나 선택하세요" options={studentApproval.professors.map((professor) => ({ value: professor.id, label: professor.name, description: professor.email }))} /></FormField> : null}
          </>
        ) : (
          null
        )}
      </FormSection> : null}
      <div className="topic-form__actions flex flex-wrap items-center justify-end gap-3">
          {state.message ? (
            <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`mt-1 text-sm font-bold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              <UiText>{state.message}</UiText>
            </p>
          ) : null}
        {wizard && wizardStep > 0 ? <button type="button" className="button-quiet" onClick={() => setWizardStep((current) => Math.max(0, current - 1))}><UiText>{"이전"}</UiText></button> : null}
        {wizard && wizardStep < wizardSteps.length - 1 ? (
          <button type="button" className="button-primary" onClick={advanceWizard}><UiText>{"다음"}</UiText></button>
        ) : (
          <button type="submit" disabled={pending || (!initialTopic && programs.length === 0)} className="button-primary max-sm:w-full">
            <UiText>{pending ? "저장 중" : initialTopic ? "변경 저장" : studentApproval ? "승인 요청 보내기" : "초안 저장"}</UiText>
          </button>
        )}
      </div>
    </form>
  );
}
