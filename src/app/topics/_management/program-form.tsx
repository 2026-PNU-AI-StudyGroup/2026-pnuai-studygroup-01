"use client";

import { UiDiv, UiInput, UiLink, UiNav } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { type InvalidEvent, useActionState, useRef, useState } from "react";

import { createProgramAction } from "@/app/topics/_management/program-actions";
import styles from "@/app/topics/_management/program-form.module.css";
import navStyles from "@/app/topics/_management/program-section-nav.module.css";
import { ProgramSectionNavIcon, type ProgramSectionNavIconName } from "@/app/topics/_management/program-section-nav";
import { ProgramPeriodRow, ProgramTeamSizeRange, ProgramVisibilitySettings, type ProgramVisibility } from "@/app/topics/_management/program-form-fields";
import {
  ProgramCreateReportBuilder,
  ProgramCreateRubricBuilder,
  type ProgramCreateReportDraft,
  type ProgramCreateRubricDraft,
} from "@/app/topics/_management/program-create-definition-builders";
import { initialProgramActionState } from "@/app/topics/_management/program-form-state";
import { ProgramVotingResultVisibilityFields } from "@/app/topics/_management/program-voting-result-visibility";
import { CategorySelect } from "@/app/topics/_management/category-select";
import { ChoiceCard, FormField, FormSection, Toggle } from "@/shared/ui/form-system";
import { TagInput } from "@/shared/ui/tag-input";

const PROGRAM_FORM_SECTIONS = [
  { id: "program-basic", label: "기본 정보" },
  { id: "program-operation", label: "운영 설정" },
  { id: "program-schedule", label: "일정" },
  { id: "program-voting", label: "투표" },
  { id: "program-rubrics", label: "채점표" },
  { id: "program-reports", label: "보고서" },
] as const;

type ProgramFormSectionId = (typeof PROGRAM_FORM_SECTIONS)[number]["id"];

const formNavIcon: Record<ProgramFormSectionId, ProgramSectionNavIconName> = {
  "program-basic": "basic",
  "program-operation": "operation",
  "program-schedule": "schedule",
  "program-voting": "voting",
  "program-rubrics": "rubric",
  "program-reports": "reports",
};

export function ProgramForm({ categoryOptions, cancelHref }: { categoryOptions: string[]; cancelHref: string }) {
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [advisorEnabled, setAdvisorEnabled] = useState<boolean | null>(null);
  const [studentProjectCreationEnabled, setStudentProjectCreationEnabled] = useState(false);
  const [name, setName] = useState("");
  const [divisionNames, setDivisionNames] = useState<string[]>([]);
  const [rubrics, setRubrics] = useState<ProgramCreateRubricDraft[]>([]);
  const [reportDefinitions, setReportDefinitions] = useState<ProgramCreateReportDraft[]>([]);
  const [teamMinSize, setTeamMinSize] = useState(2);
  const [teamMaxSize, setTeamMaxSize] = useState(6);
  const [voteLimit, setVoteLimit] = useState("3");
  const [voteLimitScope, setVoteLimitScope] = useState<"PROGRAM" | "DIVISION">("PROGRAM");
  const [visibility, setVisibility] = useState<ProgramVisibility>("PRIVATE");
  const [activeSection, setActiveSection] = useState<ProgramFormSectionId>("program-basic");
  const [validationMessage, setValidationMessage] = useState("");
  const handlingInvalidRef = useRef(false);
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
  const serializedReportDefinitions = JSON.stringify(reportDefinitions.map((definition) => ({ title: definition.title, dueAt: definition.dueAt, required: definition.required })));
  function showSection(id: ProgramFormSectionId) {
    setActiveSection(id);
    window.requestAnimationFrame(() => {
      const sections = document.getElementById("program-create-sections");
      if (sections) sections.scrollTop = 0;
    });
  }
  function ensureRubricsHaveCriteria() {
    const incompleteRubric = rubrics.find((rubric) => rubric.criteria.length === 0);
    if (!incompleteRubric) return true;
    setValidationMessage(`“${incompleteRubric.title}” 채점표에 평가 항목을 하나 이상 추가해 주세요.`);
    setActiveSection("program-rubrics");
    return false;
  }
  function moveSection(offset: -1 | 1) {
    const target = PROGRAM_FORM_SECTIONS[activeSectionIndex + offset];
    if (target) showSection(target.id);
  }
  function handleInvalid(event: InvalidEvent<HTMLFormElement>) {
    event.preventDefault();
    if (handlingInvalidRef.current) return;
    const invalidControl = event.target as HTMLElement;
    const sectionId = invalidControl.closest<HTMLElement>("[data-form-section='program-create']")?.id;
    if (!PROGRAM_FORM_SECTIONS.some((section) => section.id === sectionId)) return;

    handlingInvalidRef.current = true;
    setValidationMessage("입력하지 않았거나 올바르지 않은 필수 항목을 확인해 주세요.");
    setActiveSection(sectionId as ProgramFormSectionId);
    window.requestAnimationFrame(() => {
      const sections = document.getElementById("program-create-sections");
      const focusTarget = invalidControl.closest("[data-date-time-input], [data-custom-select]")?.querySelector<HTMLElement>("button:not(:disabled)") ?? invalidControl;
      if (sections) {
        const sectionsRect = sections.getBoundingClientRect();
        const targetRect = focusTarget.getBoundingClientRect();
        sections.scrollTop += targetRect.top - sectionsRect.top - 24;
      }
      focusTarget.focus();
      window.setTimeout(() => { handlingInvalidRef.current = false; }, 0);
    });
  }
  return <form action={action} aria-busy={pending} className={styles.root} onSubmit={(event) => {
    setValidationMessage("");
    if (!lastSection) {
      event.preventDefault();
      moveSection(1);
    } else if (!ensureRubricsHaveCriteria()) {
      event.preventDefault();
    }
  }} onInvalidCapture={handleInvalid} onChangeCapture={() => {
    if (validationMessage) setValidationMessage("");
  }}>
    <UiNav id="program-create-navigation" aria-label="프로그램 등록 항목" className={navStyles.root}>
      {PROGRAM_FORM_SECTIONS.map((section, index) => (
        <button key={section.id} type="button" aria-controls={section.id} aria-current={activeSection === section.id ? "step" : undefined} onClick={() => showSection(section.id)} className={`${navStyles.item} ${activeSection === section.id ? navStyles.itemActive : ""}`}>
          <ProgramSectionNavIcon section={formNavIcon[section.id]} />
          <span><span aria-hidden="true">{index + 1}. </span><UiText>{section.label}</UiText></span>
        </button>
      ))}
    </UiNav>

    <div id="program-create-sections" className={styles.sections} data-program-form-sections>
      <FormSection id="program-basic" hidden={activeSection !== "program-basic"} title="1. 기본 정보" description="프로그램에 필요한 기본 정보를 입력하세요." className={styles.section} contentClassName={styles.basicGrid} density="compact" sectionMarker="program-create">
        <FormField id="program-category" label="프로그램 분류">
          <CategorySelect options={categoryOptions} />
        </FormField>
        <FormField id="program-name" label="프로그램명">
          <UiInput id="program-name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required className="form-control" placeholder="예: 창의융합 해커톤" />
        </FormField>
        <ProgramVisibilitySettings value={visibility} onValueChange={setVisibility} />
        <FormField id="program-division-names" label="분과 설정" description="이름을 입력하고 Enter를 누르면 여러 분과를 추가할 수 있습니다." className={styles.fullRow}>
          <TagInput id="program-division-names" name="divisionNames" ariaLabel="분과 이름" value={divisionNames} onValuesChange={(names) => {
            setDivisionNames(names);
            setRubrics((current) => current.map((rubric) => rubric.divisionName && !names.includes(rubric.divisionName) ? { ...rubric, divisionName: null } : rubric));
            if (names.length === 0) setVoteLimitScope("PROGRAM");
          }} maxLength={40} placeholder="예: 창업 트랙, 융합 트랙" />
        </FormField>
        <input type="hidden" name="icon" value="FOLDER" />
      </FormSection>

      <FormSection id="program-operation" hidden={activeSection !== "program-operation"} title="2. 운영 설정" description="프로그램의 운영 방식을 설정하세요." className={styles.section} contentClassName={styles.operationGrid} density="compact" sectionMarker="program-create">
        <fieldset className={styles.radioGroup}>
          <legend><UiText>{"지도교수 유무"}</UiText></legend>
          <ChoiceCard variant="inline" name="advisorEnabled" value="true" checked={advisorEnabled === true} onChange={() => setAdvisorEnabled(true)} required label="지도교수 있음" />
          <ChoiceCard variant="inline" name="advisorEnabled" value="false" checked={advisorEnabled === false} onChange={() => setAdvisorEnabled(false)} required label="지도교수 없음" />
        </fieldset>
        <fieldset className={styles.radioGroup}>
          <legend><UiText>{"프로젝트 참여 방식"}</UiText></legend>
          <ChoiceCard variant="inline" name="studentProjectCreationEnabled" value="false" checked={!studentProjectCreationEnabled} onChange={() => setStudentProjectCreationEnabled(false)} required label="등록 프로젝트 직접 지원" />
          <ChoiceCard variant="inline" name="studentProjectCreationEnabled" value="true" checked={studentProjectCreationEnabled} onChange={() => setStudentProjectCreationEnabled(true)} required label="학생 팀 프로젝트 등록" />
        </fieldset>
        <div className={styles.teamPolicy}>
          <strong><UiText>{"팀 인원"}</UiText></strong>
          <p><UiText>{studentProjectCreationEnabled ? "프로젝트를 등록할 수 있는 팀의 인원 범위" : "한 팀이 구성할 수 있는 최대 인원"}</UiText></p>
          <ProgramTeamSizeRange studentProjectCreationEnabled={studentProjectCreationEnabled} teamMinSize={teamMinSize} teamMaxSize={teamMaxSize} onTeamMinSizeChange={setTeamMinSize} onTeamMaxSizeChange={(value) => { setTeamMaxSize(value); if (teamMinSize > value) setTeamMinSize(value); }} />
        </div>
      </FormSection>

      <FormSection id="program-schedule" hidden={activeSection !== "program-schedule"} title="3. 일정" description="프로그램 운영과 관련된 일정을 설정하세요." className={styles.section} contentClassName={styles.periodList} density="compact" sectionMarker="program-create">
        <ProgramPeriodRow label="전체 운영 기간" fieldLabel="운영" emphasis startId="program-starts-at" startName="startsAt" endId="program-ends-at" endName="endsAt" />
        <div className={styles.detailPeriods}>
          <strong className={styles.detailPeriodsTitle}><UiText>{"세부 일정"}</UiText></strong>
          <ProgramPeriodRow label="프로젝트 등록 기간" startId="program-registration-starts-at" startName="projectRegistrationStartsAt" endId="program-registration-ends-at" endName="projectRegistrationEndsAt" />
          {!studentProjectCreationEnabled ? <ProgramPeriodRow label="모집 기간" startId="program-recruitment-starts-at" startName="recruitmentStartsAt" endId="program-recruitment-ends-at" endName="recruitmentEndsAt" /> : null}
          <ProgramPeriodRow label="수행 기간" startId="program-execution-starts-at" startName="executionStartsAt" endId="program-execution-ends-at" endName="executionEndsAt" />
        </div>
      </FormSection>

      <FormSection id="program-voting" hidden={activeSection !== "program-voting"} title="4. 투표" className={styles.section} density="compact" sectionMarker="program-create">
        <Toggle
          name="votingEnabled"
          value="true"
          checked={votingEnabled}
          onChange={(event) => setVotingEnabled(event.target.checked)}
          label="프로젝트 투표 사용"
        />
        {votingEnabled ? (
          <div className={styles.votingOptions}>
            <ProgramPeriodRow label="투표 기간" startId="program-voting-starts-at" startName="votingStartsAt" endId="program-voting-ends-at" endName="votingEndsAt" />
            <div className={styles.votePolicy}>
              <div className={styles.voteLimit}>
                <strong><UiText>{"학생·교수 1인당 최대 투표 수"}</UiText></strong>
                <div className={styles.voteLimitControl}>
                  <UiInput id="program-vote-limit" name="voteLimit" type="number" min={1} max={100} value={voteLimit} onChange={(event) => setVoteLimit(event.target.value)} aria-label="학생·교수 1인당 최대 투표 수" required className={`form-control ${styles.voteLimitInput}`} />
                  <span aria-hidden="true"><UiText>{"표"}</UiText></span>
                </div>
              </div>
              <div className={styles.voteScopeGroup}>
                <UiDiv role="radiogroup" aria-label="투표 한도 적용 기준" className={styles.voteScope}>
                  <strong><UiText>{"투표 한도 적용 기준"}</UiText></strong>
                  <ChoiceCard variant="inline" name="voteLimitScope" value="PROGRAM" checked={voteLimitScope === "PROGRAM"} onChange={() => setVoteLimitScope("PROGRAM")} required label="프로그램 전체에서 합산" description="사용자 유형별 최대 투표 수를 프로그램 전체에서 한 번 적용" />
                  <ChoiceCard variant="inline" name="voteLimitScope" value="DIVISION" checked={voteLimitScope === "DIVISION"} onChange={() => setVoteLimitScope("DIVISION")} required disabled={divisionNames.length === 0} label="분과마다 별도 적용" description="사용자 유형별 최대 투표 수를 각 분과마다 따로 적용" />
                </UiDiv>
                {divisionNames.length === 0 ? <p className={styles.voteScopeHint}><UiText>{"분과를 추가하면 분과별 투표를 선택할 수 있습니다."}</UiText></p> : null}
              </div>
              <div className={styles.selfVoteOption}>
                <ChoiceCard variant="inline" name="selfVotingAllowed" type="checkbox" value="true" label="본인 프로젝트 투표 허용" />
              </div>
            </div>
            <ProgramVotingResultVisibilityFields />
          </div>
        ) : null}
      </FormSection>

      <FormSection id="program-rubrics" hidden={activeSection !== "program-rubrics"} title="5. 채점표 (선택)" description="공통 또는 분과별 채점표와 평가 항목을 미리 구성하세요." className={styles.section} density="compact" sectionMarker="program-create">
        <input type="hidden" name="rubricDefinitions" value={serializedRubrics} />
        <ProgramCreateRubricBuilder divisionNames={divisionNames} rubrics={rubrics} onChange={setRubrics} />
      </FormSection>

      <FormSection id="program-reports" hidden={activeSection !== "program-reports"} title="6. 보고서 (선택)" description="팀이 제출해야 할 보고서와 제출 마감을 미리 구성하세요." className={styles.section} density="compact" sectionMarker="program-create">
        <input type="hidden" name="reportDefinitions" value={serializedReportDefinitions} />
        <ProgramCreateReportBuilder reports={reportDefinitions} onChange={setReportDefinitions} />
      </FormSection>
    </div>

    <UiDiv className={`form-action-bar ${styles.actions}`} aria-label="프로그램 생성 작업" data-program-form-actions>
      <UiLink
        href={cancelHref}
        aria-label="프로그램 생성을 취소하고 관리 화면으로 돌아가기"
        aria-disabled={pending}
        onClick={pending ? (event) => event.preventDefault() : undefined}
        className={`button-secondary ${styles.cancel}`}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m11.5 4-6 6 6 6M6 10h8.5" /></svg>
        <UiText>{"취소"}</UiText>
      </UiLink>
      <div className={styles.actionStatus}>
        {state.message || validationMessage ? <p role={state.status === "error" || validationMessage ? "alert" : "status"} aria-live="polite" className={state.status === "error" || validationMessage ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{validationMessage || state.message}</UiText></p> : null}
      </div>
      <div className={styles.stepActions}>
        {activeSectionIndex > 0 ? <button type="button" className="button-secondary" onClick={() => moveSection(-1)} disabled={pending}><UiText>{"이전"}</UiText></button> : null}
        {lastSection
          ? <button key="program-submit" type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "등록 중" : "프로그램 등록"}</UiText></button>
          : <button key="program-next" type="button" className="button-primary" onClick={() => moveSection(1)} disabled={pending}><UiText>{"다음"}</UiText></button>}
      </div>
    </UiDiv>
  </form>;
}
