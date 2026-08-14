"use client";

import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import type { ProjectProgramRecord } from "@/modules/project-program/application/manage-project-programs";
import type { TopicSummary } from "@/modules/topic/application/topic-ports";
import type { TopicDetails } from "@/modules/topic/domain/topic-policy";
import styles from "@/modules/topic/ui/topic-form.module.css";
import { CustomSelect } from "@/shared/ui/custom-select";
import { ChoiceCard, FormField, FormSection, FormStaticValue, TextInput, Textarea } from "@/shared/ui/form-system";
import { IconButton } from "@/shared/ui/icon-button";
import { TagInput } from "@/shared/ui/tag-input";
import { AddIcon, TrashIcon } from "@/shared/ui/workspace-icons";

export type TopicFormActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

type TopicFormAction = (
  previousState: TopicFormActionState,
  formData: FormData,
) => Promise<TopicFormActionState>;

const initialState: TopicFormActionState = { status: "idle", message: "" };
const CREATE_TEAM_OPTION = "__create_team__";
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
    studentTeams: Array<{ id: string; name: string; memberCount: number; pendingInvitationCount?: number }>;
  };
  initialTopic?: TopicSummary;
  wizard?: {
    closeHref: string;
    createTeamHref?: string;
    onStepChange?: (step: { index: number; labels: string[] }) => void;
  };
};

type TopicFormQuestion = {
  localId: number;
  label: string;
  maxLength: number;
  required: boolean;
};

type TopicWizardStep = "BASIC" | "REQUIREMENTS" | "APPLICATION" | "FINAL" | "REVIEW";

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
  const [requiredSkills, setRequiredSkills] = useState(initialTopic?.requiredSkills ?? []);
  const [preferredSkills, setPreferredSkills] = useState(initialTopic?.preferredSkills ?? []);
  const [roleExpectations, setRoleExpectations] = useState(initialTopic?.roleExpectations ?? "");
  const [availabilityRequirement, setAvailabilityRequirement] = useState(initialTopic?.availabilityRequirement ?? "");
  const [applicationMode, setApplicationMode] = useState<TopicDetails["applicationMode"]>(initialTopic?.applicationMode ?? "INDIVIDUAL_ONLY");
  const [selectedProgramId, setSelectedProgramId] = useState(initialTopic?.programId ?? defaultProgramId ?? "");
  const [selectedDivisionId, setSelectedDivisionId] = useState(initialTopic?.divisionId ?? "");
  const [approvalRoute, setApprovalRoute] = useState<"PROFESSOR" | "ADMIN">("PROFESSOR");
  const [requestedProfessorId, setRequestedProfessorId] = useState("");
  const [studentTeamId, setStudentTeamId] = useState("");
  const [capacity, setCapacity] = useState(initialTopic?.capacity ?? 4);
  const [wizardStep, setWizardStep] = useState(0);
  const studentProposal = Boolean(studentApproval && !initialTopic);
  const defaultRecruitmentEnabled = initialTopic?.recruitmentEnabled ?? !studentProposal;
  const recruitmentEnabled = studentProposal ? false : defaultRecruitmentEnabled;
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);
  const projectTeamMinSize = selectedProgram?.projectTeamMinSize ?? 2;
  const projectTeamMaxSize = selectedProgram?.projectTeamMaxSize ?? 6;
  const eligibleStudentTeams = studentApproval?.studentTeams.filter(({ memberCount, pendingInvitationCount = 0 }) => pendingInvitationCount === 0 && memberCount >= projectTeamMinSize && memberCount <= projectTeamMaxSize) ?? [];
  const pendingInvitationTeams = studentApproval?.studentTeams.filter(({ pendingInvitationCount = 0 }) => pendingInvitationCount > 0) ?? [];
  const invalidSizeTeams = studentApproval?.studentTeams.filter(({ memberCount, pendingInvitationCount = 0 }) => pendingInvitationCount === 0 && (memberCount < projectTeamMinSize || memberCount > projectTeamMaxSize)) ?? [];
  const selectedDivision = selectedProgram?.divisions?.find(({ id }) => id === selectedDivisionId);
  const advisorEnabled = selectedProgram?.advisorEnabled;
  const wizardSteps: Array<{ id: TopicWizardStep; label: string }> = useMemo(() => studentProposal
    ? [
        { id: "FINAL", label: "팀 선택" },
        { id: "BASIC", label: "프로젝트 정보" },
        { id: "REVIEW", label: "확인 및 제출" },
      ]
    : recruitmentEnabled
    ? [
        { id: "BASIC", label: "기본 정보" },
        { id: "REQUIREMENTS", label: "지원 조건" },
        { id: "APPLICATION", label: "지원서" },
        { id: "FINAL", label: "모집 및 팀" },
        { id: "REVIEW", label: "확인 및 제출" },
      ]
    : [
        { id: "BASIC", label: "기본 정보" },
        { id: "FINAL", label: "팀 선택" },
        { id: "REVIEW", label: "확인 및 제출" },
      ], [recruitmentEnabled, studentProposal]);
  const currentWizardStepIndex = Math.min(wizardStep, wizardSteps.length - 1);
  const currentWizardStep = wizardSteps[currentWizardStepIndex];
  const formSectionAppearance = wizard ? "plain" : "embedded";
  const onWizardStepChange = wizard?.onStepChange;
  const formRef = useRef<HTMLFormElement>(null);
  const wizardSubmitIntentRef = useRef(false);
  useEffect(() => {
    if (state.status === "success" && successHref && !wizard) router.replace(successHref);
  }, [router, state.status, successHref, wizard]);
  useEffect(() => {
    onWizardStepChange?.({ index: currentWizardStepIndex, labels: wizardSteps.map(({ label }) => label) });
  }, [currentWizardStep.id, currentWizardStepIndex, onWizardStepChange, wizardSteps]);

  function advanceWizard() {
    if (!currentWizardStep || !formRef.current) return;
    const sectionIds: Record<TopicWizardStep, string[]> = {
      BASIC: studentProposal ? ["topic-basic", "topic-approval"] : ["topic-basic"],
      REQUIREMENTS: ["topic-requirements"],
      APPLICATION: ["topic-application"],
      FINAL: studentProposal ? ["topic-team"] : ["topic-schedule", "topic-approval"],
      REVIEW: [],
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
    setWizardStep(Math.min(currentWizardStepIndex + 1, wizardSteps.length - 1));
  }

  function submitWizard() {
    if (!formRef.current || currentWizardStep.id !== "REVIEW") return;
    wizardSubmitIntentRef.current = true;
    formRef.current.requestSubmit();
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
    <form
      ref={formRef}
      action={action}
      noValidate={Boolean(wizard)}
      onSubmit={(event) => {
        if (!wizard) return;
        const explicitlySubmittedFromReview = currentWizardStep.id === "REVIEW" && wizardSubmitIntentRef.current;
        wizardSubmitIntentRef.current = false;
        if (!explicitlySubmittedFromReview) {
          event.preventDefault();
          if (currentWizardStep.id !== "REVIEW") advanceWizard();
        }
      }}
      aria-busy={pending}
      className={wizard ? "mx-auto grid max-w-4xl gap-6" : `${styles.root} mx-auto grid max-w-4xl gap-4`}
    >
      {initialTopic ? <input type="hidden" name="topicId" value={initialTopic.id} /> : null}
      <FormSection id="topic-basic" title={studentProposal ? "프로젝트 정보" : "기본 정보"} appearance={formSectionAppearance} className={wizard && currentWizardStep.id !== "BASIC" ? "hidden" : ""}>
        <div className={`grid gap-4 ${!initialTopic && selectedProgram?.divisions?.length ? "sm:grid-cols-2" : ""}`}>
        {initialTopic ? <FormField label="프로그램">
          <input type="hidden" name="programId" value={initialTopic.programId} />
          <FormStaticValue>{initialTopic.programName}</FormStaticValue>
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
              const nextProgram = programs.find(({ id }) => id === value);
              if (!nextProgram?.advisorEnabled) setApprovalRoute("ADMIN");
              const nextMinSize = nextProgram?.projectTeamMinSize ?? 2;
              const nextMaxSize = nextProgram?.projectTeamMaxSize ?? 6;
              const selectedTeam = studentApproval?.studentTeams.find(({ id }) => id === studentTeamId);
              if (selectedTeam && (selectedTeam.memberCount < nextMinSize || selectedTeam.memberCount > nextMaxSize || (selectedTeam.pendingInvitationCount ?? 0) > 0)) setStudentTeamId("");
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
        <input type="hidden" name="recruitmentEnabled" value={String(recruitmentEnabled)} />
        {studentProposal ? <><input type="hidden" name="applicationMode" value="TEAM_ONLY" /><input type="hidden" name="capacity" value="1" /></> : null}
      </FormSection>
      {recruitmentEnabled && !studentProposal ? <>
      <FormSection id="topic-requirements" title="지원 조건" appearance={formSectionAppearance} className={wizard && currentWizardStep.id !== "REQUIREMENTS" ? "hidden" : ""} contentClassName="sm:grid-cols-2">
        <FormField id="topic-required-skills" label="필수 기술">
          <TagInput id="topic-required-skills" name="requiredSkills" ariaLabel="필수 기술" value={requiredSkills} onValuesChange={setRequiredSkills} maxLength={1000} required placeholder="TypeScript, Python" />
        </FormField>
        <FormField id="topic-preferred-skills" label="우대 기술" optional>
          <TagInput id="topic-preferred-skills" name="preferredSkills" ariaLabel="우대 기술" value={preferredSkills} onValuesChange={setPreferredSkills} maxLength={1000} placeholder="Docker, Figma" />
        </FormField>
        <FormField id="topic-role-expectations" label="예상 역할">
          <UiTextarea id="topic-role-expectations" name="roleExpectations" value={roleExpectations} onChange={(e) => setRoleExpectations(e.target.value)} maxLength={500} required rows={3} className="form-control" placeholder="예: 프론트엔드 구현과 사용자 테스트" />
        </FormField>
        <FormField id="topic-availability" label="활동 가능 시간 조건">
          <UiTextarea id="topic-availability" name="availabilityRequirement" value={availabilityRequirement} onChange={(e) => setAvailabilityRequirement(e.target.value)} maxLength={500} required rows={3} className="form-control" placeholder="예: 매주 수요일 18시 정기 회의 참여" />
        </FormField>
      </FormSection>
      <FormSection id="topic-application" title="지원서" appearance={formSectionAppearance} className={wizard && currentWizardStep.id !== "APPLICATION" ? "hidden" : ""}>
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="sr-only"><UiText>{"프로젝트 지원 방식"}</UiText></legend>
          {[
            ["INDIVIDUAL_ONLY", "개인만"],
            ["TEAM_ONLY", "팀만"],
            ["INDIVIDUAL_OR_TEAM", "개인·팀"],
          ].map(([value, label, description]) => <ChoiceCard key={value} density={wizard ? "default" : "compact"} name="applicationMode" value={value} checked={applicationMode === value} onChange={() => setApplicationMode(value as TopicDetails["applicationMode"])} required label={label} description={description} />)}
        </fieldset>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h3 className="font-semibold"><UiText>{"문항"}</UiText></h3>
          <button type="button" className="button-secondary gap-2" onClick={() => setQuestions((current) => [...current, { localId: nextQuestionId.current++, label: "", maxLength: 500, required: true }])} disabled={questions.length >= 20}><AddIcon className="size-4 shrink-0" /><UiText>{"문항 추가"}</UiText></button>
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
      <FormSection id="topic-schedule" title="모집" appearance={formSectionAppearance} className={wizard && currentWizardStep.id !== "FINAL" ? "hidden" : ""} contentClassName="sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-end">
      <label className="grid gap-2 text-sm font-medium">
        <UiText>{"모집 인원"}</UiText><TextInput name="capacity" type="number" min="1" max="100" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} required />
      </label>
      <div className="rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-sm">
        <span className="block text-xs font-semibold text-[var(--muted)]"><UiText>{"모집 기간"}</UiText></span>
        <span className="mt-1 block font-semibold"><UiText>{selectedProgram?.recruitmentStartsAt && selectedProgram.recruitmentEndsAt ? `${programDate.format(selectedProgram.recruitmentStartsAt)} – ${programDate.format(selectedProgram.recruitmentEndsAt)}` : "모집 기간 없음"}</UiText></span>
      </div>
      </FormSection>
      </> : null}
      {wizard && currentWizardStep.id === "REVIEW" ? (
        <section aria-labelledby="topic-review-title" className="grid gap-5">
          <div className="border-b border-[var(--line)] pb-4">
            <h2 id="topic-review-title" className="text-lg font-bold"><UiText>{"입력 내용 확인"}</UiText></h2>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"프로그램"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{selectedProgram?.name ?? "선택 안 됨"}</UiText>{selectedDivision ? <><span className="text-[var(--muted)]"> · </span><UiText>{selectedDivision.name}</UiText></> : null}</dd></div>
            {!studentProposal ? <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"팀원 모집"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{recruitmentEnabled ? "지원 받기" : "지원 안 받기"}</UiText></dd></div> : null}
            <div className="sm:col-span-2"><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"프로젝트명"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{title}</UiText></dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"설명"}</UiText></dt><dd className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap leading-6"><UiText>{description}</UiText></dd></div>
            {recruitmentEnabled ? <>
              <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"필수 기술"}</UiText></dt><dd className="mt-1 font-semibold">{requiredSkills.join(", ")}</dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"우대 기술"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{preferredSkills.join(", ") || "없음"}</UiText></dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"예상 역할"}</UiText></dt><dd className="mt-1 leading-6"><UiText>{roleExpectations}</UiText></dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"활동 조건"}</UiText></dt><dd className="mt-1 leading-6"><UiText>{availabilityRequirement}</UiText></dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"지원 방식"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{{ INDIVIDUAL_ONLY: "개인만", TEAM_ONLY: "팀만", INDIVIDUAL_OR_TEAM: "개인·팀" }[applicationMode]}</UiText></dd></div>
              <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"지원서 문항"}</UiText></dt><dd className="mt-1 font-semibold">{questions.length}<UiText>{"개"}</UiText></dd></div>
              <div className="sm:col-span-2"><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"문항 목록"}</UiText></dt><dd className="mt-1"><ol className="grid gap-1">{questions.map((question, index) => <li key={question.localId}>{index + 1}. <UiText>{question.label}</UiText></li>)}</ol></dd></div>
            </> : null}
            {recruitmentEnabled ? <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"모집 인원"}</UiText></dt><dd className="mt-1 font-semibold">{capacity}<UiText>{"명"}</UiText></dd></div> : null}
            <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"참여 팀"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{studentApproval?.studentTeams.find(({ id }) => id === studentTeamId)?.name ?? "선택 안 됨"}</UiText></dd></div>
            <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"검토 요청 대상"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{advisorEnabled === false || approvalRoute === "ADMIN" ? "관리자" : studentApproval?.professors.find(({ id }) => id === requestedProfessorId)?.name ?? "교수 선택 안 됨"}</UiText></dd></div>
          </dl>
        </section>
      ) : null}
      {studentProposal && studentApproval ? <FormSection id="topic-team" title="팀 선택" appearance={formSectionAppearance} className={wizard && currentWizardStep.id !== "FINAL" ? "hidden" : ""}>
        {eligibleStudentTeams.length || wizard?.createTeamHref ? <FormField id="topic-student-team" label="참여 팀" description={`확정 팀원 ${projectTeamMinSize}–${projectTeamMaxSize}명인 팀만 선택할 수 있습니다.`} required>
          <CustomSelect
            id="topic-student-team"
            name="studentTeamId"
            ariaLabel="참여 팀"
            value={studentTeamId}
            onValueChange={(value) => {
              if (value === CREATE_TEAM_OPTION && wizard?.createTeamHref) {
                router.replace(wizard.createTeamHref);
                return;
              }
              setStudentTeamId(value);
            }}
            required
            placeholder="팀을 선택하세요"
            options={[
              ...eligibleStudentTeams.map((team) => ({ value: team.id, label: team.name, description: `${team.memberCount}명` })),
              ...(wizard?.createTeamHref ? [{ value: CREATE_TEAM_OPTION, label: "새 팀 만들기", description: "팀 생성 페이지로 이동" }] : []),
            ]}
          />
        </FormField> : <p className="text-sm text-[var(--muted)]"><UiText>{pendingInvitationTeams.length ? "초대 응답이 모두 끝난 팀만 프로젝트를 제안할 수 있습니다." : "프로젝트를 제안하려면 먼저 팀을 만들어야 합니다."}</UiText></p>}
        {pendingInvitationTeams.length ? <p className="text-sm text-[var(--muted)]"><UiText>{`초대 응답 대기 중인 팀 ${pendingInvitationTeams.length}개는 모든 초대가 처리된 뒤 선택할 수 있습니다.`}</UiText></p> : null}
        {invalidSizeTeams.length ? <p className="text-sm text-[var(--muted)]"><UiText>{`팀 인원 기준(${projectTeamMinSize}–${projectTeamMaxSize}명)에 맞지 않는 팀 ${invalidSizeTeams.length}개는 선택할 수 없습니다.`}</UiText></p> : null}
      </FormSection> : null}
      {studentApproval ? <FormSection id="topic-approval" title="검토 요청" appearance={formSectionAppearance} className={wizard && currentWizardStep.id !== "BASIC" ? "hidden" : ""}>
        {advisorEnabled === false ? (
          <><input type="hidden" name="approvalRoute" value="ADMIN" /><p className="text-sm text-[var(--muted)]"><UiText>{"이 프로그램의 승인 요청은 관리자가 검토합니다."}</UiText></p></>
        ) : advisorEnabled === true ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard density={wizard ? "default" : "compact"} name="approvalRoute" value="PROFESSOR" checked={approvalRoute === "PROFESSOR"} onChange={() => setApprovalRoute("PROFESSOR")} label="교수 검토" />
              <ChoiceCard density={wizard ? "default" : "compact"} name="approvalRoute" value="ADMIN" checked={approvalRoute === "ADMIN"} onChange={() => setApprovalRoute("ADMIN")} label="관리자 검토" />
            </div>
            {approvalRoute === "PROFESSOR" ? <FormField id="topic-professor" label="검토 요청 교수"><CustomSelect id="topic-professor" name="requestedProfessorId" ariaLabel="검토 요청 교수" value={requestedProfessorId} onValueChange={setRequestedProfessorId} required searchable placeholder="교수를 검색하거나 선택하세요" options={studentApproval.professors.map((professor) => ({ value: professor.id, label: professor.name, description: professor.email }))} /></FormField> : null}
          </>
        ) : (
          null
        )}
      </FormSection> : null}
      <div className={`${styles.actions} flex flex-wrap items-center justify-end gap-3`}>
          {state.message ? (
            <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`mt-1 text-sm font-bold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
              <UiText>{state.message}</UiText>
            </p>
          ) : null}
        {wizard && currentWizardStepIndex > 0 ? <button type="button" className="button-quiet" onClick={() => setWizardStep(Math.max(0, currentWizardStepIndex - 1))}><UiText>{"이전"}</UiText></button> : null}
        {wizard ? currentWizardStepIndex < wizardSteps.length - 1 ? (
          <button type="button" className="button-primary" onClick={advanceWizard} disabled={studentProposal && currentWizardStep.id === "FINAL" && !studentTeamId}><UiText>{"다음"}</UiText></button>
        ) : (
          <button type="button" onClick={submitWizard} disabled={pending || (!initialTopic && programs.length === 0)} className="button-primary max-sm:w-full">
            <UiText>{pending ? "제출 중" : "프로젝트 제안 제출"}</UiText>
          </button>
        ) : (
          <button type="submit" disabled={pending || (!initialTopic && programs.length === 0)} className="button-primary max-sm:w-full">
            <UiText>{pending ? "저장 중" : initialTopic ? "변경 저장" : studentApproval ? "승인 요청 보내기" : "초안 저장"}</UiText>
          </button>
        )}
      </div>
    </form>
  );
}
