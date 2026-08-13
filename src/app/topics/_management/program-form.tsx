"use client";

import { UiInput, UiLink, UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState, useState } from "react";

import { createProgramAction } from "@/app/topics/_management/program-actions";
import {
  ProgramCreateReportBuilder,
  ProgramCreateRubricBuilder,
  type ProgramCreateReportDraft,
  type ProgramCreateRubricDraft,
} from "@/app/topics/_management/program-create-definition-builders";
import { initialProgramActionState } from "@/app/topics/_management/program-form-state";
import { CategorySelect } from "@/app/topics/_management/category-select";
import { ChoiceCard, DateTimeInput, FormField, FormSection, Textarea, Toggle } from "@/shared/ui/form-system";
import { TagInput } from "@/shared/ui/tag-input";

const PROGRAM_FORM_SECTIONS = [
  { id: "program-basic", label: "기본 정보" },
  { id: "program-divisions", label: "분과 설정" },
  { id: "program-schedule", label: "일정" },
  { id: "program-operation", label: "운영 설정" },
  { id: "program-voting", label: "투표" },
  { id: "program-rubrics", label: "채점표" },
  { id: "program-reports", label: "보고서" },
] as const;

type ProgramFormSectionId = (typeof PROGRAM_FORM_SECTIONS)[number]["id"];

function ProgramFormSectionIcon({ section }: { section: ProgramFormSectionId }) {
  if (section === "program-basic") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m8 7 4-3 4 3v4l-4 3-4-3Z" /><path d="m8 11-3 2v4l3 2 4-3m4-5 3 2v4l-3 2-4-3" /></svg>;
  }
  if (section === "program-schedule") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 9.5h16" /></svg>;
  }
  if (section === "program-divisions") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M12 10v2.5M6 14v-1.5h12V14" /></svg>;
  }
  if (section === "program-operation") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9.5 4.5h5l.6 2.1 2 .8 1.9-1.1 2.5 4.3-1.6 1.5.3 2.1 1.7 1.4-2.5 4.3-2-.9-1.7 1.3-.4 2.2h-5l-.5-2.2-1.7-1.2-2 .8-2.5-4.3 1.7-1.4.2-2.1-1.6-1.5 2.5-4.3 2 1.1 2-.8Z" /><circle cx="12" cy="13" r="2.5" /></svg>;
  }
  if (section === "program-rubrics") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 4h10v16H7zM9.5 8h5M9.5 12h5M9.5 16h3" /><path d="m4 8 1 1 2-2" /></svg>;
  }
  if (section === "program-reports") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 3.5h8l4 4V20H6zM14 3.5V8h4M9 12h6M9 15.5h6" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 4h8v6H8zM6 10h12l1.5 3.5V20h-15v-6.5Z" /><path d="M9 14h6M10 7l1.2 1.2L14 5.5" /></svg>;
}

function NumberStepper({ id, name, label, value, onChange, min = 1, max = 100 }: {
  id: string;
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  const update = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <div className="program-create-form__stepper">
      <UiInput id={id} name={name} type="number" min={min} max={max} value={value} onChange={(event) => update(Number(event.target.value))} aria-label={label} required />
      <button type="button" onClick={() => update(value - 1)} disabled={value <= min} aria-label={`${label} 줄이기`}>−</button>
      <button type="button" onClick={() => update(value + 1)} disabled={value >= max} aria-label={`${label} 늘리기`}>＋</button>
    </div>
  );
}

function ProgramPeriodRow({ label, startId, startName, endId, endName }: {
  label: string;
  startId: string;
  startName: string;
  endId: string;
  endName: string;
}) {
  const fieldLabel = label.replace(" 기간", "");
  return (
    <div className="program-create-form__period-row">
      <strong className="program-create-form__period-title"><UiText>{label}</UiText></strong>
      <div className="program-create-form__period-inputs">
        <div className="program-create-form__period-field">
          <span className="program-create-form__period-label"><UiText>{"시작"}</UiText></span>
          <DateTimeInput id={startId} name={startName} aria-label={`${fieldLabel} 시작`} required />
        </div>
        <span className="program-create-form__period-separator" aria-hidden="true">–</span>
        <div className="program-create-form__period-field">
          <span className="program-create-form__period-label"><UiText>{"종료"}</UiText></span>
          <DateTimeInput id={endId} name={endName} aria-label={`${fieldLabel} 종료`} required />
        </div>
      </div>
    </div>
  );
}

export function ProgramForm({ categoryOptions, cancelHref }: { categoryOptions: string[]; cancelHref: string }) {
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [studentProjectCreationEnabled, setStudentProjectCreationEnabled] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [divisionNames, setDivisionNames] = useState<string[]>([]);
  const [rubrics, setRubrics] = useState<ProgramCreateRubricDraft[]>([]);
  const [reportDefinitions, setReportDefinitions] = useState<ProgramCreateReportDraft[]>([]);
  const [teamMinSize, setTeamMinSize] = useState(2);
  const [teamMaxSize, setTeamMaxSize] = useState(6);
  const [voteLimit, setVoteLimit] = useState(3);
  const [voteLimitScope, setVoteLimitScope] = useState<"PROGRAM" | "DIVISION">("PROGRAM");
  const [activeSection, setActiveSection] = useState<ProgramFormSectionId>("program-basic");
  const [state, action, pending] = useActionState(createProgramAction, initialProgramActionState);
  const activeSectionIndex = PROGRAM_FORM_SECTIONS.findIndex(({ id }) => id === activeSection);
  const lastSection = activeSectionIndex === PROGRAM_FORM_SECTIONS.length - 1;
  const serializedRubrics = JSON.stringify(rubrics.map((rubric) => ({
    divisionName: rubric.divisionName,
    title: rubric.title,
    gradingDueAt: rubric.gradingDueAt,
    audience: rubric.audience,
    criteria: rubric.criteria.map((criterion) => ({ label: criterion.label, maxPoints: criterion.maxPoints })),
  })));
  const serializedReportDefinitions = JSON.stringify(reportDefinitions.map((definition) => ({ title: definition.title, dueAt: definition.dueAt })));
  function showSection(id: ProgramFormSectionId) {
    setActiveSection(id);
    window.requestAnimationFrame(() => document.getElementById("program-create-navigation")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function moveSection(offset: -1 | 1) {
    const target = PROGRAM_FORM_SECTIONS[activeSectionIndex + offset];
    if (target) showSection(target.id);
  }
  return <form action={action} aria-busy={pending} className="program-create-form" onSubmit={(event) => {
    if (!lastSection) {
      event.preventDefault();
      moveSection(1);
    }
  }}>
    <UiNav id="program-create-navigation" aria-label="프로그램 등록 항목" className="program-create-form__anchor-nav">
      {PROGRAM_FORM_SECTIONS.map((section) => (
        <button key={section.id} type="button" aria-controls={section.id} aria-current={activeSection === section.id ? "step" : undefined} onClick={() => showSection(section.id)}>
          <ProgramFormSectionIcon section={section.id} />
          <UiText>{section.label}</UiText>
        </button>
      ))}
    </UiNav>

    <p className="program-create-form__progress flex items-center justify-between gap-4 text-xs text-[var(--muted)]" aria-live="polite"><span className="font-bold"><UiText>{PROGRAM_FORM_SECTIONS[activeSectionIndex].label}</UiText></span><strong className="text-[var(--primary)] tabular-nums">{activeSectionIndex + 1} / {PROGRAM_FORM_SECTIONS.length}</strong></p>

    <div className="program-create-form__sections">
      <FormSection id="program-basic" hidden={activeSection !== "program-basic"} title="1. 기본 정보" description="프로그램에 필요한 기본 정보를 입력하세요." className="program-create-form__section" contentClassName="program-create-form__basic-grid">
        <FormField id="program-category" label="프로그램 분류">
          <CategorySelect options={categoryOptions} />
        </FormField>
        <FormField id="program-name" label="프로그램명">
          <UiInput id="program-name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required className="form-control" placeholder="예: 창의융합 해커톤" />
        </FormField>
        <FormField id="program-description" label="설명" className="program-create-form__full-row">
          <div className="program-create-form__description-input">
            <Textarea id="program-description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} required rows={4} placeholder="프로그램에 대한 설명을 입력하세요." />
            <span aria-hidden="true">{description.length.toLocaleString()} / 5,000</span>
          </div>
        </FormField>
        <input type="hidden" name="icon" value="FOLDER" />
      </FormSection>

      <FormSection id="program-divisions" hidden={activeSection !== "program-divisions"} title="2. 분과 설정" description="프로그램에서 사용할 분과를 추가하세요. 분과 없이 생성한 뒤 관리 화면에서 추가할 수도 있습니다." className="program-create-form__section">
        <FormField id="program-division-names" label="분과 이름" description="이름을 입력하고 Enter를 누르면 여러 분과를 추가할 수 있습니다.">
          <TagInput id="program-division-names" name="divisionNames" ariaLabel="분과 이름" value={divisionNames} onValuesChange={(names) => {
            setDivisionNames(names);
            setRubrics((current) => current.map((rubric) => rubric.divisionName && !names.includes(rubric.divisionName) ? { ...rubric, divisionName: null } : rubric));
            if (names.length === 0) setVoteLimitScope("PROGRAM");
          }} maxLength={40} placeholder="예: 창업 분과" />
        </FormField>
      </FormSection>

      <FormSection id="program-schedule" hidden={activeSection !== "program-schedule"} title="3. 일정" description="프로그램 운영과 관련된 일정을 설정하세요." className="program-create-form__section" contentClassName="program-create-form__period-list">
        <ProgramPeriodRow label="운영 기간" startId="program-starts-at" startName="startsAt" endId="program-ends-at" endName="endsAt" />
        <ProgramPeriodRow label="등록 기간" startId="program-registration-starts-at" startName="projectRegistrationStartsAt" endId="program-registration-ends-at" endName="projectRegistrationEndsAt" />
        <ProgramPeriodRow label="모집 기간" startId="program-recruitment-starts-at" startName="recruitmentStartsAt" endId="program-recruitment-ends-at" endName="recruitmentEndsAt" />
        <ProgramPeriodRow label="수행 기간" startId="program-execution-starts-at" startName="executionStartsAt" endId="program-execution-ends-at" endName="executionEndsAt" />
      </FormSection>

      <FormSection id="program-operation" hidden={activeSection !== "program-operation"} title="4. 운영 설정" description="프로그램의 운영 방식을 설정하세요." className="program-create-form__section" contentClassName="program-create-form__operation-grid">
        <fieldset className="program-create-form__radio-group">
          <legend><UiText>{"지도교수 유무"}</UiText></legend>
          <label><input type="radio" name="advisorEnabled" value="true" required /><UiText>{"지도교수 있음"}</UiText></label>
          <label><input type="radio" name="advisorEnabled" value="false" required /><UiText>{"지도교수 없음"}</UiText></label>
        </fieldset>
        <fieldset className="program-create-form__radio-group">
          <legend><UiText>{"프로젝트 참여 방식"}</UiText></legend>
          <label><input type="radio" name="studentProjectCreationEnabled" value="false" checked={!studentProjectCreationEnabled} onChange={() => setStudentProjectCreationEnabled(false)} required /><UiText>{"등록 프로젝트 직접 지원"}</UiText></label>
          <label><input type="radio" name="studentProjectCreationEnabled" value="true" checked={studentProjectCreationEnabled} onChange={() => setStudentProjectCreationEnabled(true)} required /><UiText>{"학생 팀 프로젝트 제안"}</UiText></label>
        </fieldset>
        <div className="program-create-form__team-policy">
          <strong><UiText>{"팀 인원"}</UiText></strong>
          <p><UiText>{studentProjectCreationEnabled ? "프로젝트를 제안할 수 있는 팀의 인원 범위" : "한 팀이 구성할 수 있는 최대 인원"}</UiText></p>
          {studentProjectCreationEnabled ? <NumberStepper id="project-team-min-size" name="projectTeamMinSize" label="팀 최소 인원" value={teamMinSize} onChange={setTeamMinSize} max={teamMaxSize} /> : <input type="hidden" name="projectTeamMinSize" value="2" />}
          <NumberStepper id="project-team-max-size" name="projectTeamMaxSize" label="팀 최대 인원" value={teamMaxSize} onChange={(value) => { setTeamMaxSize(value); if (teamMinSize > value) setTeamMinSize(value); }} min={studentProjectCreationEnabled ? teamMinSize : 1} />
        </div>
      </FormSection>

      <FormSection id="program-voting" hidden={activeSection !== "program-voting"} title="5. 투표" description="프로그램 심사·선정에 투표를 사용할지 설정하세요." className="program-create-form__section">
        <Toggle
          name="votingEnabled"
          value="true"
          checked={votingEnabled}
          onChange={(event) => setVotingEnabled(event.target.checked)}
          label="프로젝트 투표 사용"
          description="활성 사용자 전체가 공개 이력이 있는 프로젝트에 투표할 수 있습니다."
        />
        {votingEnabled ? (
          <div className="program-create-form__voting-options">
            <ProgramPeriodRow label="투표 기간" startId="program-voting-starts-at" startName="votingStartsAt" endId="program-voting-ends-at" endName="votingEndsAt" />
            <div className="program-create-form__vote-limit">
              <div><strong><UiText>{"인당 가능 투표수"}</UiText></strong><p><UiText>{"사용자가 한 번에 투표할 수 있는 최대 개수"}</UiText></p></div>
              <NumberStepper id="program-vote-limit" name="voteLimit" label="인당 가능 투표수" value={voteLimit} onChange={setVoteLimit} />
            </div>
            <div role="group" aria-label="투표 옵션" className="program-create-form__vote-option-grid">
              <ChoiceCard name="voteLimitScope" value="PROGRAM" checked={voteLimitScope === "PROGRAM"} onChange={() => setVoteLimitScope("PROGRAM")} required label="프로그램 전체" description="프로그램 전체에서 선택" />
              <ChoiceCard name="voteLimitScope" value="DIVISION" checked={voteLimitScope === "DIVISION"} onChange={() => setVoteLimitScope("DIVISION")} required disabled={divisionNames.length === 0} label="분과별" description={divisionNames.length ? "분과별로 하나 이상 선택" : "분과를 추가하면 선택 가능"} />
              <ChoiceCard name="selfVotingAllowed" type="checkbox" value="true" label="자기 프로젝트 투표 허용" description="작성자 프로젝트에도 투표 가능" />
            </div>
          </div>
        ) : null}
      </FormSection>

      <FormSection id="program-rubrics" hidden={activeSection !== "program-rubrics"} title="6. 채점표" description="공통 또는 분과별 채점표와 평가 항목을 미리 구성하세요." className="program-create-form__section">
        <input type="hidden" name="rubricDefinitions" value={serializedRubrics} />
        <ProgramCreateRubricBuilder divisionNames={divisionNames} rubrics={rubrics} onChange={setRubrics} />
      </FormSection>

      <FormSection id="program-reports" hidden={activeSection !== "program-reports"} title="7. 보고서" description="팀이 제출해야 할 보고서와 제출 마감을 미리 구성하세요." className="program-create-form__section">
        <input type="hidden" name="reportDefinitions" value={serializedReportDefinitions} />
        <ProgramCreateReportBuilder reports={reportDefinitions} onChange={setReportDefinitions} />
      </FormSection>
    </div>

    <div className="form-action-bar program-create-form__actions">
      <UiLink
        href={cancelHref}
        aria-label="프로그램 생성을 취소하고 관리 화면으로 돌아가기"
        aria-disabled={pending}
        onClick={pending ? (event) => event.preventDefault() : undefined}
        className="button-secondary program-create-form__cancel"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m11.5 4-6 6 6 6M6 10h8.5" /></svg>
        <UiText>{"취소"}</UiText>
      </UiLink>
      <div className="program-create-form__action-status">
        {state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}
      </div>
      <div className="program-create-form__step-actions">
        {activeSectionIndex > 0 ? <button type="button" className="button-secondary" onClick={() => moveSection(-1)} disabled={pending}><UiText>{"이전"}</UiText></button> : null}
        {lastSection
          ? <button type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "등록 중" : "프로그램 등록"}</UiText></button>
          : <button type="button" className="button-primary" onClick={() => moveSection(1)} disabled={pending}><UiText>{"다음"}</UiText></button>}
      </div>
    </div>
  </form>;
}
