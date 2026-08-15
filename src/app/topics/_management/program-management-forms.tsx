"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  updateProgramBasicInfoAction,
  updateProgramOperationAction,
  updateProgramScheduleAction,
  updateProgramVotingPolicyAction,
} from "@/app/topics/_management/program-actions";
import { CategorySelect } from "@/app/topics/_management/category-select";
import { ProgramPeriodRow, ProgramTeamSizeRange, ProgramVisibilitySettings, type ProgramVisibility } from "@/app/topics/_management/program-form-fields";
import { initialProgramActionState } from "@/app/topics/_management/program-form-state";
import formStyles from "@/app/topics/_management/program-form.module.css";
import styles from "@/app/topics/_management/program-management.module.css";
import { ProgramStatusForm } from "@/app/topics/_management/program-status-form";
import { ProgramVotingResultVisibilityFields } from "@/app/topics/_management/program-voting-result-visibility";
import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";
import { programManagementHref } from "@/modules/project-program/ui/program-management-route";
import { UiDiv, UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard, FormField, FormSection, Textarea, TextInput, Toggle } from "@/shared/ui/form-system";
import { TagInput } from "@/shared/ui/tag-input";

type ProgramDates = {
  startsAt: Date; endsAt: Date;
  registrationStartsAt: Date; registrationEndsAt: Date;
  recruitmentStartsAt: Date | null; recruitmentEndsAt: Date | null;
  executionStartsAt: Date; executionEndsAt: Date;
};

function ActionBar({ state, pending, label }: { state: typeof initialProgramActionState; pending: boolean; label: string }) {
  return <div className={styles.actionBar}>
    <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>{state.message}</p> : null}</div>
    <button type="submit" className="button-primary" disabled={pending}>{pending ? "저장 중" : label}</button>
  </div>;
}

export function ProgramBasicInfoPanel({ program, categoryOptions, tracks }: {
  program: { id: string; name: string; category: string; description: string; isPublic: boolean; endsAt: Date };
  categoryOptions: string[];
  tracks: Array<{ name: string }>;
}) {
  const [description, setDescription] = useState(program.description);
  const [visibility, setVisibility] = useState<ProgramVisibility>(program.isPublic ? "PUBLIC" : "PRIVATE");
  const [divisionNames, setDivisionNames] = useState(() => tracks.map((track) => track.name));
  const [state, action, pending] = useActionState(updateProgramBasicInfoAction, initialProgramActionState);
  return <div className={styles.panel}>
    <form action={action} aria-busy={pending} className={styles.form}>
      <input type="hidden" name="programId" value={program.id} />
      <FormSection appearance="plain" title="기본 정보" className={styles.section} contentClassName={formStyles.basicGrid}>
          <FormField id="management-program-category" label="프로그램 분류">
            <CategorySelect options={categoryOptions} defaultValue={program.category} />
          </FormField>
          <FormField id="management-program-name" label="프로그램명">
            <TextInput id="management-program-name" name="name" defaultValue={program.name} maxLength={200} required placeholder="예: 창의융합 해커톤" />
          </FormField>
          <FormField id="management-program-description" label="설명" className={formStyles.fullRow}>
            <div className={formStyles.descriptionInput}>
              <Textarea id="management-program-description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} required rows={4} placeholder="프로그램에 대한 설명을 입력하세요." />
              <span aria-hidden="true">{description.length.toLocaleString()} / 5,000</span>
            </div>
          </FormField>
          <ProgramVisibilitySettings value={visibility} onValueChange={setVisibility} />
          <FormField id="management-program-division-names" label="분과 설정" description="이름을 입력하고 Enter를 누르면 여러 분과를 추가할 수 있습니다." className={formStyles.fullRow}>
            <TagInput id="management-program-division-names" name="divisionNames" ariaLabel="분과 이름" value={divisionNames} onValuesChange={setDivisionNames} maxLength={40} placeholder="예: 창업 트랙, 융합 트랙" />
          </FormField>
      </FormSection>
      {state.status === "confirm" && state.divisionSyncImpact ? <div className={styles.confirm} role="alert">
        <input type="hidden" name="confirmedDivisionIds" value={state.divisionSyncImpact.divisionIds.join(",")} />
        <input type="hidden" name="confirmedDivisionProjectCount" value={state.divisionSyncImpact.projectCount} />
        <input type="hidden" name="confirmedDivisionVoteCount" value={state.divisionSyncImpact.voteCount} />
        <input type="hidden" name="confirmedDivisionSwitchesVotingScope" value={String(state.divisionSyncImpact.switchesVotingScope)} />
        <UiText>{`분과 ${state.divisionSyncImpact.divisionNames.join(", ")}을 삭제하면 프로젝트 ${state.divisionSyncImpact.projectCount}개가 미분과로 이동하고 투표 ${state.divisionSyncImpact.voteCount}표가 초기화됩니다.`}</UiText>
      </div> : null}
      <ActionBar state={state} pending={pending} label={state.status === "confirm" ? "분과 삭제 확인 후 저장" : "기본 정보 저장"} />
    </form>
    <section className={styles.section}>
      <ProgramStatusForm id={program.id} isPublic={program.isPublic} endsAt={program.endsAt} showVisibility={false} />
    </section>
  </div>;
}

export function ProgramOperationPanel({ program }: { program: { id: string; advisorEnabled: boolean; studentProjectCreationEnabled: boolean; projectTeamMinSize: number; projectTeamMaxSize: number } }) {
  const [proposalMode, setProposalMode] = useState(program.studentProjectCreationEnabled);
  const [advisorEnabled, setAdvisorEnabled] = useState(program.advisorEnabled);
  const [teamMinSize, setTeamMinSize] = useState(program.projectTeamMinSize);
  const [teamMaxSize, setTeamMaxSize] = useState(program.projectTeamMaxSize);
  const [state, action, pending] = useActionState(updateProgramOperationAction, initialProgramActionState);
  const requiresSchedule = program.studentProjectCreationEnabled && !proposalMode;
  const savedAdvisorEnabled = state.status === "success" && state.savedAdvisorEnabled !== undefined ? state.savedAdvisorEnabled : program.advisorEnabled;
  const hasUnsavedAdvisorChange = advisorEnabled !== savedAdvisorEnabled;
  return <div className={styles.panel}>
    <form action={action} aria-busy={pending} className={styles.form}>
      <input type="hidden" name="programId" value={program.id} />
      <FormSection appearance="plain" title="운영 설정" className={styles.section} contentClassName={formStyles.operationGrid}>
          <fieldset className={formStyles.radioGroup}>
            <legend><UiText>{"지도교수 유무"}</UiText></legend>
            <ChoiceCard variant="inline" name="advisorEnabled" value="true" checked={advisorEnabled} onChange={() => setAdvisorEnabled(true)} required label="지도교수 있음" />
            <ChoiceCard variant="inline" name="advisorEnabled" value="false" checked={!advisorEnabled} onChange={() => setAdvisorEnabled(false)} required label="지도교수 없음" />
          </fieldset>
          <fieldset className={formStyles.radioGroup}>
            <legend><UiText>{"프로젝트 참여 방식"}</UiText></legend>
            <ChoiceCard variant="inline" name="enabled" value="false" checked={!proposalMode} onChange={() => setProposalMode(false)} required label="등록 프로젝트 직접 지원" />
            <ChoiceCard variant="inline" name="enabled" value="true" checked={proposalMode} onChange={() => setProposalMode(true)} required label="학생 팀 프로젝트 제안" />
          </fieldset>
          <div className={formStyles.teamPolicy}>
            <strong><UiText>{"팀 인원"}</UiText></strong>
            <p><UiText>{proposalMode ? "프로젝트를 제안할 수 있는 팀의 인원 범위" : "한 팀이 구성할 수 있는 최대 인원"}</UiText></p>
            <ProgramTeamSizeRange studentProjectCreationEnabled={proposalMode} teamMinSize={teamMinSize} teamMaxSize={teamMaxSize} onTeamMinSizeChange={setTeamMinSize} onTeamMaxSizeChange={(value) => { setTeamMaxSize(value); if (teamMinSize > value) setTeamMinSize(value); }} />
          </div>
      </FormSection>
      {requiresSchedule ? <div className={styles.transitionNotice}>
        <p><UiText>{"직접 지원 방식으로 바꾸려면 모집 기간을 함께 설정해야 합니다."}</UiText></p>
        {hasUnsavedAdvisorChange ? <><input type="hidden" name="operationIntent" value="ADVISOR_ONLY" /><ActionBar state={state} pending={pending} label="지도교수 설정 저장" /></> : <Link className="button-primary" href={`${programManagementHref(program.id, "schedule")}?targetMode=DIRECT`}><UiText>{"모집 기간 설정으로 이동"}</UiText></Link>}
      </div> : <ActionBar state={state} pending={pending} label="운영 설정 저장" />}
    </form>
  </div>;
}

export function ProgramSchedulePanel({ program, targetMode }: { program: ProgramDates & { id: string; studentProjectCreationEnabled: boolean }; targetMode: "CURRENT" | "DIRECT" }) {
  const [state, action, pending] = useActionState(updateProgramScheduleAction, initialProgramActionState);
  const directMode = targetMode === "DIRECT" || !program.studentProjectCreationEnabled;
  return <div className={styles.panel}>
    <form action={action} aria-busy={pending} className={styles.form}>
      <input type="hidden" name="programId" value={program.id} />
      <input type="hidden" name="targetMode" value={targetMode} />
      <FormSection appearance="plain" title="일정" className={styles.section} contentClassName={formStyles.periodList}>
          <ProgramPeriodRow label="전체 운영 기간" fieldLabel="운영" emphasis startId="management-starts-at" startName="startsAt" endId="management-ends-at" endName="endsAt" startValue={program.startsAt} endValue={program.endsAt} />
          <div className={formStyles.detailPeriods}>
            <strong className={formStyles.detailPeriodsTitle}><UiText>{"세부 일정"}</UiText></strong>
            <ProgramPeriodRow label="등록 기간" startId="management-registration-starts-at" startName="projectRegistrationStartsAt" endId="management-registration-ends-at" endName="projectRegistrationEndsAt" startValue={program.registrationStartsAt} endValue={program.registrationEndsAt} />
            {directMode ? <ProgramPeriodRow label="모집 기간" startId="management-recruitment-starts-at" startName="recruitmentStartsAt" endId="management-recruitment-ends-at" endName="recruitmentEndsAt" startValue={program.recruitmentStartsAt ?? undefined} endValue={program.recruitmentEndsAt ?? undefined} /> : null}
            <ProgramPeriodRow label="수행 기간" startId="management-execution-starts-at" startName="executionStartsAt" endId="management-execution-ends-at" endName="executionEndsAt" startValue={program.executionStartsAt} endValue={program.executionEndsAt} />
          </div>
      </FormSection>
      <ActionBar state={state} pending={pending} label={targetMode === "DIRECT" ? "직접 지원 방식으로 전환" : "일정 저장"} />
    </form>
  </div>;
}

export function ProgramVotingPanel({ programId, votingPolicy, divisionCount, results }: { programId: string; votingPolicy: ProgramVotingPolicyDetails | null; divisionCount: number; results: React.ReactNode }) {
  const [enabled, setEnabled] = useState(votingPolicy !== null);
  const [voteLimit, setVoteLimit] = useState(votingPolicy?.voteLimit ?? 3);
  const [voteLimitScope, setVoteLimitScope] = useState<"PROGRAM" | "DIVISION">(votingPolicy?.voteLimitScope ?? "PROGRAM");
  const [state, action, pending] = useActionState(updateProgramVotingPolicyAction, initialProgramActionState);
  return <div className={styles.panel}>
    <form action={action} aria-busy={pending} className={styles.form}>
      <input type="hidden" name="programId" value={programId} />
      <FormSection id="voting-policy" appearance="plain" title="투표" className={styles.section}>
        <Toggle name="votingEnabled" value="true" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} label="프로젝트 투표 사용" />
        {enabled ? <div className={formStyles.votingOptions}>
          <ProgramPeriodRow label="투표 기간" startId="management-voting-starts-at" startName="votingStartsAt" endId="management-voting-ends-at" endName="votingEndsAt" startValue={votingPolicy?.startsAt} endValue={votingPolicy?.endsAt} />
          <div className={formStyles.votePolicy}>
            <div className={formStyles.voteLimit}>
              <strong><UiText>{"인당 가능 투표수"}</UiText></strong>
              <div className={formStyles.voteLimitControl}>
                <UiInput id="management-vote-limit" name="voteLimit" type="number" min={1} max={100} value={voteLimit} onChange={(event) => setVoteLimit(Math.min(100, Math.max(1, Number(event.target.value))))} aria-label="인당 가능 투표수" required className={`form-control ${formStyles.voteLimitInput}`} />
                <span aria-hidden="true"><UiText>{"표"}</UiText></span>
              </div>
            </div>
            <div className={formStyles.voteLimit}>
              <strong><UiText>{"관계자 가능 투표수"}</UiText></strong>
              <div className={formStyles.voteLimitControl}>
                <UiInput id="management-staff-vote-limit" name="staffVoteLimit" type="number" min={1} max={100} defaultValue={votingPolicy?.staffVoteLimit ?? 5} aria-label="관계자 가능 투표수" required className={`form-control ${formStyles.voteLimitInput}`} />
                <span aria-hidden="true"><UiText>{"표"}</UiText></span>
              </div>
            </div>
            <div className={formStyles.voteScopeGroup}>
              <UiDiv role="radiogroup" aria-label="투표 범위" className={formStyles.voteScope}>
                <strong><UiText>{"투표 범위"}</UiText></strong>
                <ChoiceCard variant="inline" name="voteLimitScope" value="PROGRAM" checked={voteLimitScope === "PROGRAM"} onChange={() => setVoteLimitScope("PROGRAM")} required label="프로그램 전체" />
                <ChoiceCard variant="inline" name="voteLimitScope" value="DIVISION" checked={voteLimitScope === "DIVISION"} onChange={() => setVoteLimitScope("DIVISION")} required disabled={divisionCount === 0} label="분과별" />
              </UiDiv>
              {divisionCount === 0 ? <p className={formStyles.voteScopeHint}><UiText>{"분과를 추가하면 분과별 투표를 선택할 수 있습니다."}</UiText></p> : null}
            </div>
            <div className={formStyles.selfVoteOption}>
              <ChoiceCard variant="inline" name="selfVotingAllowed" type="checkbox" value="true" defaultChecked={votingPolicy?.selfVotingAllowed} label="자기 프로젝트 투표 허용" />
            </div>
          </div>
          <ProgramVotingResultVisibilityFields defaultDuringVoting={votingPolicy?.resultsVisibleDuringVoting ?? false} defaultAfterVoting={votingPolicy?.resultsVisibleAfterVoting ?? true} />
        </div> : null}
        {state.status === "confirm" && state.voteResetImpact ? <div role="alert" className={styles.confirm}><input type="hidden" name="confirmedVoteCount" value={state.voteResetImpact.voteCount} /><input type="hidden" name="confirmedVoteFromLimit" value={state.voteResetImpact.from.voteLimit} /><input type="hidden" name="confirmedVoteFromScope" value={state.voteResetImpact.from.voteLimitScope} /><input type="hidden" name="confirmedVoteLimit" value={state.voteResetImpact.to.voteLimit} /><input type="hidden" name="confirmedVoteLimitScope" value={state.voteResetImpact.to.voteLimitScope} /><UiText>{`기존 표 ${state.voteResetImpact.voteCount}개를 초기화한 뒤 저장합니다.`}</UiText></div> : null}
      </FormSection>
      <ActionBar state={state} pending={pending} label={state.status === "confirm" ? "기존 표 초기화 후 저장" : "투표 정책 저장"} />
    </form>
    <FormSection appearance="plain" title="득표현황" className={styles.section}>
      {results}
    </FormSection>
  </div>;
}
