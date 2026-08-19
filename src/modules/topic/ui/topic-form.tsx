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
    studentTeams: Array<{ id: string; name: string; memberCount: number; pendingInvitationCount?: number; members?: Array<{ id: string; name: string }> }>;
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

const STUDENT_REGISTRATION_STEPS = ["팀 선택", "프로젝트 정보", "확인 및 제출"] as const;

export function TopicForm(props: TopicFormProps) {
  if (props.studentApproval && !props.initialTopic) {
    if (!props.wizard) throw new Error("학생 프로젝트 등록은 전용 단계형 폼으로만 렌더링해야 합니다.");
    return <StudentProjectRegistrationWizard {...props} studentApproval={props.studentApproval} wizard={props.wizard} />;
  }
  return <TopicFormEditor {...props} />;
}

function StudentProjectRegistrationWizard({ action: createTopic, programs, defaultProgramId, studentApproval, wizard }: TopicFormProps & {
  studentApproval: NonNullable<TopicFormProps["studentApproval"]>;
  wizard: NonNullable<TopicFormProps["wizard"]>;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createTopic, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [selectedProgramId, setSelectedProgramId] = useState(defaultProgramId ?? "");
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [studentTeamId, setStudentTeamId] = useState("");
  const [projectRepresentativeId, setProjectRepresentativeId] = useState("");
  const [projectTeamName, setProjectTeamName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [approvalRoute, setApprovalRoute] = useState<"PROFESSOR" | "ADMIN">("PROFESSOR");
  const [requestedProfessorId, setRequestedProfessorId] = useState("");
  const submitIntent = useRef(false);
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);
  const teamMinSize = selectedProgram?.projectTeamMinSize ?? 2;
  const teamMaxSize = selectedProgram?.projectTeamMaxSize ?? 6;
  // 응답을 기다리는 초대는 등록을 막지 않는다. 남은 초대는 등록 시점에 함께 철회된다.
  const eligibleTeams = studentApproval.studentTeams.filter(({ memberCount }) => (
    memberCount >= teamMinSize && memberCount <= teamMaxSize
  ));
  const invalidSizeTeams = studentApproval.studentTeams.filter(({ memberCount }) => (
    memberCount < teamMinSize || memberCount > teamMaxSize
  ));
  const advisorEnabled = selectedProgram?.advisorEnabled;
  const selectedStudentTeam = studentApproval.studentTeams.find(({ id }) => id === studentTeamId);

  useEffect(() => {
    wizard.onStepChange?.({ index: step, labels: [...STUDENT_REGISTRATION_STEPS] });
  }, [step, wizard]);

  function validateStep(stepIndex: number) {
    const sectionId = ["topic-team", "topic-project-info", "topic-registration-review"][stepIndex];
    const controls = Array.from(formRef.current?.querySelectorAll<HTMLElement>(`#${sectionId} input, #${sectionId} textarea, #${sectionId} select`) ?? []);
    const invalid = controls.find((control) => "checkValidity" in control && !(control as HTMLInputElement).checkValidity());
    if (!invalid) return true;
    (invalid as HTMLInputElement).reportValidity();
    invalid.focus();
    return false;
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, STUDENT_REGISTRATION_STEPS.length - 1));
  }

  function submit() {
    if (!formRef.current || step !== STUDENT_REGISTRATION_STEPS.length - 1) return;
    submitIntent.current = true;
    formRef.current.requestSubmit();
  }

  if (state.status === "success") {
    return (
      <div className="grid min-h-72 place-content-center gap-5 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--success-subtle)] text-2xl font-bold text-[var(--success)]">✓</div>
        <div>
          <h3 className="text-xl font-bold"><UiText>{"승인 요청을 보냈습니다"}</UiText></h3>
          <p className="mt-2 text-sm text-[var(--muted)]"><UiText>{"검토 상태는 내 승인 요청에서 확인할 수 있습니다."}</UiText></p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="button-secondary" onClick={() => router.replace("/dashboard?view=pending")}><UiText>{"검토 중인 프로젝트 보기"}</UiText></button>
          <button type="button" className="button-primary" onClick={() => router.replace(wizard.closeHref)}><UiText>{"완료"}</UiText></button>
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      noValidate
      aria-busy={pending}
      className="mx-auto grid max-w-4xl gap-6"
      onSubmit={(event) => {
        const explicitlySubmitted = step === STUDENT_REGISTRATION_STEPS.length - 1 && submitIntent.current;
        submitIntent.current = false;
        if (explicitlySubmitted) return;
        event.preventDefault();
        if (step < STUDENT_REGISTRATION_STEPS.length - 1) next();
      }}
    >
      <input type="hidden" name="recruitmentEnabled" value="false" />
      <input type="hidden" name="applicationMode" value="TEAM_ONLY" />
      <input type="hidden" name="capacity" value="1" />

      <FormSection id="topic-team" title="팀 선택" appearance="plain" hidden={step !== 0}>
        {eligibleTeams.length || wizard.createTeamHref ? <FormField id="topic-student-team" label="참여 팀" description={`팀장인 팀만 표시됩니다. 확정 팀원 ${teamMinSize}–${teamMaxSize}명인 팀을 선택할 수 있습니다.`} required>
          <CustomSelect
            id="topic-student-team"
            name="sourceStudentTeamId"
            ariaLabel="참여 팀"
            value={studentTeamId}
            onValueChange={(value) => {
              if (value === CREATE_TEAM_OPTION && wizard.createTeamHref) {
                router.replace(wizard.createTeamHref);
                return;
              }
              const nextTeam = studentApproval.studentTeams.find(({ id }) => id === value);
              setStudentTeamId(value);
              setProjectTeamName(nextTeam?.name ?? "");
              setProjectRepresentativeId("");
            }}
            required
            placeholder="팀을 선택하세요"
            options={[
              ...eligibleTeams.map((team) => ({ value: team.id, label: team.name, description: `${team.memberCount}명` })),
              ...(wizard.createTeamHref ? [{ value: CREATE_TEAM_OPTION, label: "새 팀 만들기", description: "팀 생성 페이지로 이동" }] : []),
            ]}
          />
        </FormField> : <p className="text-sm text-[var(--muted)]"><UiText>{"프로젝트는 팀장만 등록할 수 있습니다. 팀이 없으면 새로 만들고, 이미 속한 팀이 있으면 팀장에게 등록을 요청해 주세요."}</UiText></p>}
        {selectedStudentTeam ? <div className="grid gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <div><p className="text-sm font-bold"><UiText>{"팀원"}</UiText></p><ul className="mt-2 flex flex-wrap gap-2">{(selectedStudentTeam.members ?? []).map((member) => <li key={member.id} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold"><UiText>{member.name}</UiText></li>)}</ul></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="topic-project-team-name" label="프로젝트 팀명" required><TextInput id="topic-project-team-name" name="projectTeamName" value={projectTeamName} onChange={(event) => setProjectTeamName(event.target.value)} maxLength={100} required /></FormField>
            <FormField id="topic-project-representative" label="프로젝트 대표" required><CustomSelect id="topic-project-representative" name="projectRepresentativeId" ariaLabel="프로젝트 대표" value={projectRepresentativeId} onValueChange={setProjectRepresentativeId} required placeholder="대표를 선택하세요" options={(selectedStudentTeam.members ?? []).map((member) => ({ value: member.id, label: member.name }))} /></FormField>
          </div>
        </div> : null}
        {invalidSizeTeams.length ? <p className="text-sm text-[var(--muted)]"><UiText>{`팀 인원 기준(${teamMinSize}–${teamMaxSize}명)에 맞지 않는 팀 ${invalidSizeTeams.length}개는 선택할 수 없습니다.`}</UiText></p> : null}
      </FormSection>

      <FormSection id="topic-project-info" title="프로젝트 정보" appearance="plain" hidden={step !== 1}>
        <div className={`grid gap-4 ${selectedProgram?.divisions?.length ? "sm:grid-cols-2" : ""}`}>
          <FormField id="topic-program" label="프로그램" required>
            <CustomSelect
              id="topic-program"
              name="programId"
              ariaLabel="프로그램"
              required
              searchable
              value={selectedProgramId}
              placeholder="프로그램을 선택하세요"
              onValueChange={(value) => {
                setSelectedProgramId(value);
                setSelectedDivisionId("");
                const nextProgram = programs.find(({ id }) => id === value);
                if (!nextProgram?.advisorEnabled) setApprovalRoute("ADMIN");
                const nextMinSize = nextProgram?.projectTeamMinSize ?? 2;
                const nextMaxSize = nextProgram?.projectTeamMaxSize ?? 6;
                const selectedTeam = studentApproval.studentTeams.find(({ id }) => id === studentTeamId);
                if (selectedTeam && (selectedTeam.memberCount < nextMinSize || selectedTeam.memberCount > nextMaxSize || (selectedTeam.pendingInvitationCount ?? 0) > 0)) setStudentTeamId("");
              }}
              options={programs.map((program) => ({ value: program.id, label: program.name, description: `${programDate.format(program.startsAt)} – ${programDate.format(program.endsAt)}` }))}
            />
          </FormField>
          {selectedProgram?.divisions?.length ? <FormField id="topic-division" label="분과" required>
            <CustomSelect id="topic-division" name="divisionId" ariaLabel="분과" required value={selectedDivisionId} onValueChange={setSelectedDivisionId} placeholder="분과를 선택하세요" options={selectedProgram.divisions.map((division) => ({ value: division.id, label: division.name }))} />
          </FormField> : null}
        </div>
        <FormField id="topic-title" label="프로젝트명" required>
          <TextInput id="topic-title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
        </FormField>
        <FormField id="topic-description" label="설명" required>
          <Textarea id="topic-description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10_000} required rows={4} />
        </FormField>
        <section aria-labelledby="topic-approval-title" className="grid gap-4 border-t border-[var(--line)] pt-5">
          <h3 id="topic-approval-title" className="text-sm font-bold"><UiText>{"검토 요청"}</UiText></h3>
          {advisorEnabled === false ? <><input type="hidden" name="approvalRoute" value="ADMIN" /><p className="text-sm text-[var(--muted)]"><UiText>{"이 프로그램의 승인 요청은 관리자가 검토합니다."}</UiText></p></> : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard density="compact" name="approvalRoute" value="PROFESSOR" checked={approvalRoute === "PROFESSOR"} onChange={() => setApprovalRoute("PROFESSOR")} label="교수 검토" />
                <ChoiceCard density="compact" name="approvalRoute" value="ADMIN" checked={approvalRoute === "ADMIN"} onChange={() => setApprovalRoute("ADMIN")} label="관리자 검토" />
              </div>
              {approvalRoute === "PROFESSOR" ? <FormField id="topic-professor" label="검토 요청 교수" required><CustomSelect id="topic-professor" name="requestedProfessorId" ariaLabel="검토 요청 교수" value={requestedProfessorId} onValueChange={setRequestedProfessorId} required searchable placeholder="교수를 검색하거나 선택하세요" options={studentApproval.professors.map((professor) => ({ value: professor.id, label: professor.name, description: professor.email }))} /></FormField> : null}
            </>
          )}
        </section>
      </FormSection>

      <section id="topic-registration-review" hidden={step !== 2} aria-labelledby="topic-review-title" className="grid gap-5">
        <div className="border-b border-[var(--line)] pb-4">
          <h2 id="topic-review-title" className="text-lg font-bold"><UiText>{"입력 내용 확인"}</UiText></h2>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"프로젝트 팀"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{projectTeamName || "입력 안 됨"}</UiText></dd></div>
          <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"프로젝트 대표"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{selectedStudentTeam?.members?.find(({ id }) => id === projectRepresentativeId)?.name ?? "선택 안 됨"}</UiText></dd></div>
          <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"검토 요청 대상"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{advisorEnabled === false || approvalRoute === "ADMIN" ? "관리자" : studentApproval.professors.find(({ id }) => id === requestedProfessorId)?.name ?? "교수 선택 안 됨"}</UiText></dd></div>
          <div className="sm:col-span-2"><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"프로그램"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{selectedProgram?.name ?? "선택 안 됨"}</UiText>{selectedProgram?.divisions?.find(({ id }) => id === selectedDivisionId) ? <><span className="text-[var(--muted)]"> · </span><UiText>{selectedProgram.divisions.find(({ id }) => id === selectedDivisionId)?.name ?? ""}</UiText></> : null}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"프로젝트명"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{title}</UiText></dd></div>
          <div className="sm:col-span-2"><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"설명"}</UiText></dt><dd className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap leading-6"><UiText>{description}</UiText></dd></div>
        </dl>
      </section>

      <div className={`${styles.actions} flex flex-wrap items-center justify-end gap-3`}>
        {state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`mt-1 text-sm font-bold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
        {step > 0 ? <button type="button" className="button-quiet" onClick={() => setStep((current) => current - 1)}><UiText>{"이전"}</UiText></button> : null}
        {step < STUDENT_REGISTRATION_STEPS.length - 1 ? <button type="button" className="button-primary" onClick={next} disabled={step === 0 && (!studentTeamId || !projectTeamName || !projectRepresentativeId)}><UiText>{"다음"}</UiText></button> : <button type="button" className="button-primary max-sm:w-full" onClick={submit} disabled={pending}><UiText>{pending ? "제출 중" : "프로젝트 등록 제출"}</UiText></button>}
      </div>
    </form>
  );
}

function TopicFormEditor({ action: createTopic, programs, defaultProgramId, successHref, studentApproval, initialTopic, wizard }: TopicFormProps) {
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
  const studentRegistration = Boolean(studentApproval && !initialTopic);
  const defaultRecruitmentEnabled = initialTopic?.recruitmentEnabled ?? !studentRegistration;
  const recruitmentEnabled = studentRegistration ? false : defaultRecruitmentEnabled;
  const selectedProgram = programs.find(({ id }) => id === selectedProgramId);
  const projectTeamMinSize = selectedProgram?.projectTeamMinSize ?? 2;
  const projectTeamMaxSize = selectedProgram?.projectTeamMaxSize ?? 6;
  const eligibleStudentTeams = studentApproval?.studentTeams.filter(({ memberCount }) => memberCount >= projectTeamMinSize && memberCount <= projectTeamMaxSize) ?? [];
  const invalidSizeTeams = studentApproval?.studentTeams.filter(({ memberCount }) => memberCount < projectTeamMinSize || memberCount > projectTeamMaxSize) ?? [];
  const selectedDivision = selectedProgram?.divisions?.find(({ id }) => id === selectedDivisionId);
  const advisorEnabled = selectedProgram?.advisorEnabled;
  const wizardSteps: Array<{ id: TopicWizardStep; label: string }> = useMemo(() => studentRegistration
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
      ], [recruitmentEnabled, studentRegistration]);
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
      BASIC: studentRegistration ? ["topic-basic", "topic-approval"] : ["topic-basic"],
      REQUIREMENTS: ["topic-requirements"],
      APPLICATION: ["topic-application"],
      FINAL: studentRegistration ? ["topic-team"] : ["topic-schedule", "topic-approval"],
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
      <FormSection id="topic-basic" title={studentRegistration ? "프로젝트 정보" : "기본 정보"} appearance={formSectionAppearance} className={wizard && currentWizardStep.id !== "BASIC" ? "hidden" : ""}>
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
        {studentRegistration ? <><input type="hidden" name="applicationMode" value="TEAM_ONLY" /><input type="hidden" name="capacity" value="1" /></> : null}
      </FormSection>
      {recruitmentEnabled && !studentRegistration ? <>
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
            {!studentRegistration ? <div><dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"팀원 모집"}</UiText></dt><dd className="mt-1 font-semibold"><UiText>{recruitmentEnabled ? "지원 받기" : "지원 안 받기"}</UiText></dd></div> : null}
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
      {studentRegistration && studentApproval ? <FormSection id="topic-team" title="팀 선택" appearance={formSectionAppearance} className={wizard && currentWizardStep.id !== "FINAL" ? "hidden" : ""}>
        {eligibleStudentTeams.length || wizard?.createTeamHref ? <FormField id="topic-student-team" label="참여 팀" description={`팀장인 팀만 표시됩니다. 확정 팀원 ${projectTeamMinSize}–${projectTeamMaxSize}명인 팀을 선택할 수 있습니다.`} required>
          <CustomSelect
            id="topic-student-team"
            name="sourceStudentTeamId"
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
        </FormField> : <p className="text-sm text-[var(--muted)]"><UiText>{"프로젝트는 팀장만 등록할 수 있습니다. 팀이 없으면 새로 만들고, 이미 속한 팀이 있으면 팀장에게 등록을 요청해 주세요."}</UiText></p>}
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
          <button type="button" className="button-primary" onClick={advanceWizard} disabled={studentRegistration && currentWizardStep.id === "FINAL" && !studentTeamId}><UiText>{"다음"}</UiText></button>
        ) : (
          <button type="button" onClick={submitWizard} disabled={pending || (!initialTopic && programs.length === 0)} className="button-primary max-sm:w-full">
            <UiText>{pending ? "제출 중" : "프로젝트 등록 제출"}</UiText>
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
