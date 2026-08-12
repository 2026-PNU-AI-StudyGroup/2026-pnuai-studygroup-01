"use client";

import { useActionState, useState } from "react";

import { updateProgramSettingsAction } from "@/app/admin/programs/_actions/program-actions";
import { CategorySelect } from "@/app/admin/programs/_components/category-select";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard, DateTimeInput, FormField, FormSection, Textarea, TextInput, Toggle } from "@/shared/ui/form-system";

type ProgramPolicyFormProps = {
  programId: string;
  name: string;
  category: string;
  categoryOptions: string[];
  description: string;
  startsAt: Date;
  endsAt: Date;
  advisorEnabled: boolean;
  registrationStartsAt: Date;
  registrationEndsAt: Date;
  recruitmentStartsAt: Date;
  recruitmentEndsAt: Date;
  executionStartsAt: Date;
  executionEndsAt: Date;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
  votingPolicy: ProgramVotingPolicyDetails | null;
  divisionCount?: number;
};

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

export function ProgramPolicyForm({ programId, name, category, categoryOptions, description, startsAt, endsAt, advisorEnabled, registrationStartsAt, registrationEndsAt, recruitmentStartsAt, recruitmentEndsAt, executionStartsAt, executionEndsAt, submissionStartsAt, submissionEndsAt, votingPolicy, divisionCount = 0 }: ProgramPolicyFormProps) {
  const [enabled, setEnabled] = useState(votingPolicy !== null);
  const [state, action, pending] = useActionState(updateProgramSettingsAction, initialProgramActionState);

  return (
    <form action={action} aria-busy={pending} className="grid gap-4">
      <input type="hidden" name="programId" value={programId} />
      <FormSection title="프로그램 정보" description="등록 뒤에도 기본 정보와 운영 기간을 바로잡을 수 있습니다." contentClassName="sm:grid-cols-2">
        <FormField id="settings-program-category" label="프로그램 분류" description="목록에서 고르거나 '새 분류 추가'로 직접 넣을 수 있습니다.">
          <CategorySelect options={categoryOptions} defaultValue={category} />
        </FormField>
        <FormField id="settings-program-name" label="프로그램명" className="sm:col-span-2">
          <TextInput id="settings-program-name" name="name" maxLength={200} defaultValue={name} required />
        </FormField>
        <FormField id="settings-program-description" label="설명" className="sm:col-span-2">
          <Textarea id="settings-program-description" name="description" maxLength={5000} rows={4} defaultValue={description} required />
        </FormField>
        <FormField id="settings-program-starts-at" label="운영 시작">
          <DateTimeInput id="settings-program-starts-at" name="startsAt" defaultValue={koreanDateTimeLocal(startsAt)} required />
        </FormField>
        <FormField id="settings-program-ends-at" label="운영 종료">
          <DateTimeInput id="settings-program-ends-at" name="endsAt" defaultValue={koreanDateTimeLocal(endsAt)} required />
        </FormField>
        <fieldset className="grid gap-3 sm:col-span-2">
          <legend className="form-field__label"><UiText>{"지도교수 배정 여부"}</UiText></legend>
          <ChoiceCard name="advisorEnabled" value="true" defaultChecked={advisorEnabled} required label="지도교수 있음" description="학생 제안은 지정한 지도교수가 검토합니다." />
          <ChoiceCard name="advisorEnabled" value="false" defaultChecked={!advisorEnabled} required label="지도교수 없음" description="학생 제안은 관리자가 검토합니다." />
        </fieldset>
      </FormSection>
      <FormSection title="프로젝트 등록 기간" description="운영 기간 안에서 새 프로젝트 등록과 최초 공개를 제한합니다." contentClassName="sm:grid-cols-2">
        <FormField id="settings-registration-starts-at" label="등록 시작" required>
          <DateTimeInput id="settings-registration-starts-at" name="projectRegistrationStartsAt" defaultValue={koreanDateTimeLocal(registrationStartsAt)} required />
        </FormField>
        <FormField id="settings-registration-ends-at" label="등록 종료" required>
          <DateTimeInput id="settings-registration-ends-at" name="projectRegistrationEndsAt" defaultValue={koreanDateTimeLocal(registrationEndsAt)} required />
        </FormField>
      </FormSection>

      <FormSection title="프로그램 공통 일정" description="이 프로그램의 모든 프로젝트에 모집·수행·제출 기간을 동일하게 적용합니다." contentClassName="sm:grid-cols-2">
        <FormField id="settings-recruitment-starts-at" label="모집 시작" required>
          <DateTimeInput id="settings-recruitment-starts-at" name="recruitmentStartsAt" defaultValue={koreanDateTimeLocal(recruitmentStartsAt)} required />
        </FormField>
        <FormField id="settings-recruitment-ends-at" label="모집 종료" required>
          <DateTimeInput id="settings-recruitment-ends-at" name="recruitmentEndsAt" defaultValue={koreanDateTimeLocal(recruitmentEndsAt)} required />
        </FormField>
        <FormField id="settings-execution-starts-at" label="수행 시작" required>
          <DateTimeInput id="settings-execution-starts-at" name="executionStartsAt" defaultValue={koreanDateTimeLocal(executionStartsAt)} required />
        </FormField>
        <FormField id="settings-execution-ends-at" label="수행 종료" required>
          <DateTimeInput id="settings-execution-ends-at" name="executionEndsAt" defaultValue={koreanDateTimeLocal(executionEndsAt)} required />
        </FormField>
        <FormField id="settings-submission-starts-at" label="제출 시작" required>
          <DateTimeInput id="settings-submission-starts-at" name="submissionStartsAt" defaultValue={koreanDateTimeLocal(submissionStartsAt)} required />
        </FormField>
        <FormField id="settings-submission-ends-at" label="제출 종료" required>
          <DateTimeInput id="settings-submission-ends-at" name="submissionEndsAt" defaultValue={koreanDateTimeLocal(submissionEndsAt)} required />
        </FormField>
      </FormSection>

      <FormSection id="voting-policy" title="프로젝트 투표" description="투표기간, 인당 가능 투표수, 자기 프로젝트 투표와 결과 공개 방식을 관리합니다." contentClassName="sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Toggle
            name="votingEnabled"
            value="true"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            label="프로젝트 투표 사용"
            description="투표 정책을 해제하려면 저장된 표가 없어야 합니다. 표가 있으면 종료 시각을 조정해 마감하세요."
          />
        </div>
        <FormField id="settings-voting-starts-at" label="투표 시작" required={enabled}>
          <DateTimeInput id="settings-voting-starts-at" name="votingStartsAt" defaultValue={votingPolicy ? koreanDateTimeLocal(votingPolicy.startsAt) : ""} required={enabled} disabled={!enabled} />
        </FormField>
        <FormField id="settings-voting-ends-at" label="투표 종료" required={enabled}>
          <DateTimeInput id="settings-voting-ends-at" name="votingEndsAt" defaultValue={votingPolicy ? koreanDateTimeLocal(votingPolicy.endsAt) : ""} required={enabled} disabled={!enabled} />
        </FormField>
        <FormField id="settings-vote-limit" label="인당 가능 투표수" required={enabled}>
          <TextInput id="settings-vote-limit" name="voteLimit" type="number" min={1} inputMode="numeric" defaultValue={votingPolicy?.voteLimit ?? ""} required={enabled} disabled={!enabled} />
        </FormField>
        <fieldset className="grid gap-3 sm:col-span-2">
          <legend className="form-field__label"><UiText>{"투표 범위"}</UiText></legend>
          <ChoiceCard name="voteLimitScope" value="PROGRAM" defaultChecked={!votingPolicy || votingPolicy.voteLimitScope === "PROGRAM"} required={enabled} disabled={!enabled} label="프로그램 전체" description="프로그램 전체에서 인당 N표까지 선택합니다." />
          <ChoiceCard name="voteLimitScope" value="DIVISION" defaultChecked={votingPolicy?.voteLimitScope === "DIVISION"} required={enabled} disabled={!enabled || divisionCount === 0} label="분과별" description={divisionCount ? "각 분과에서 각각 인당 N표까지 선택합니다." : "분과를 하나 이상 등록한 뒤 사용할 수 있습니다."} />
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="form-field__label"><UiText>{"득표현황 투표자 표시"}</UiText></legend>
          <ChoiceCard name="identityVisibility" value="ANONYMOUS" defaultChecked={votingPolicy?.identityVisibility === "ANONYMOUS"} required={enabled} disabled={!enabled} label="익명 집계" description="관리자 결과에서 개인별 선택을 숨깁니다." />
          <ChoiceCard name="identityVisibility" value="NAMED" defaultChecked={votingPolicy?.identityVisibility === "NAMED"} required={enabled} disabled={!enabled} label="기명 집계" description="관리자 결과에서 사용자별 선택을 표시합니다." />
        </fieldset>
        <div className="sm:col-span-2">
          <ChoiceCard name="selfVotingAllowed" type="checkbox" value="true" defaultChecked={votingPolicy?.selfVotingAllowed} disabled={!enabled} label="자기 프로젝트 투표 허용" description="작성자·프로젝트 관리자·조교·팀원이 자신의 프로젝트에 투표할 수 있게 합니다." />
        </div>
        {state.status === "confirm" && state.voteResetImpact ? <div role="alert" className="sm:col-span-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] p-4 text-sm">
          <input type="hidden" name="confirmedVoteCount" value={state.voteResetImpact.voteCount} />
          <input type="hidden" name="confirmedVoteFromLimit" value={state.voteResetImpact.from.voteLimit} />
          <input type="hidden" name="confirmedVoteFromScope" value={state.voteResetImpact.from.voteLimitScope} />
          <input type="hidden" name="confirmedVoteLimit" value={state.voteResetImpact.to.voteLimit} />
          <input type="hidden" name="confirmedVoteLimitScope" value={state.voteResetImpact.to.voteLimitScope} />
          <p className="font-bold text-[var(--danger)]"><UiText>{`${state.voteResetImpact.voteCount}표가 삭제됩니다.`}</UiText></p>
          <p className="mt-1 text-[var(--muted)]"><UiText>{`${scopeLabel(state.voteResetImpact.from.voteLimitScope)} ${state.voteResetImpact.from.voteLimit}표에서 ${scopeLabel(state.voteResetImpact.to.voteLimitScope)} ${state.voteResetImpact.to.voteLimit}표로 변경하며, 모든 참여자가 새 규칙으로 다시 투표해야 합니다.`}</UiText></p>
        </div> : null}
      </FormSection>

      <div className="form-action-bar">
        <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
        <button type="submit" className="button-primary max-sm:w-full" disabled={pending}><UiText>{pending ? "저장 중" : state.status === "confirm" ? "기존 표 초기화 후 저장" : "설정 저장"}</UiText></button>
      </div>
    </form>
  );
}

function scopeLabel(scope: "PROGRAM" | "DIVISION") {
  return scope === "DIVISION" ? "분과별" : "프로그램 전체";
}
