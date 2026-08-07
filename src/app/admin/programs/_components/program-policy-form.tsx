"use client";

import { useActionState, useState } from "react";

import { updateProgramSettingsAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard, DateTimeInput, FormField, FormSection, TextInput, Toggle } from "@/shared/ui/form-system";

type ProgramPolicyFormProps = {
  programId: string;
  registrationStartsAt: Date;
  registrationEndsAt: Date;
  recruitmentEndsAt: Date;
  votingPolicy: ProgramVotingPolicyDetails | null;
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

export function ProgramPolicyForm({ programId, registrationStartsAt, registrationEndsAt, recruitmentEndsAt, votingPolicy }: ProgramPolicyFormProps) {
  const [enabled, setEnabled] = useState(votingPolicy !== null);
  const [state, action, pending] = useActionState(updateProgramSettingsAction, initialProgramActionState);

  return (
    <form action={action} aria-busy={pending} className="grid gap-4">
      <input type="hidden" name="programId" value={programId} />
      <FormSection title="프로젝트 등록 기간" description="운영기간과 독립적으로 새 프로젝트 등록과 최초 공개를 제한합니다." contentClassName="sm:grid-cols-2">
        <FormField id="settings-registration-starts-at" label="등록 시작" required>
          <DateTimeInput id="settings-registration-starts-at" name="projectRegistrationStartsAt" defaultValue={koreanDateTimeLocal(registrationStartsAt)} required />
        </FormField>
        <FormField id="settings-registration-ends-at" label="등록 종료" required>
          <DateTimeInput id="settings-registration-ends-at" name="projectRegistrationEndsAt" defaultValue={koreanDateTimeLocal(registrationEndsAt)} required />
        </FormField>
      </FormSection>

      <FormSection title="프로젝트 모집 마감" description="개별 프로젝트가 아닌 프로그램 전체에 적용되는 학생 지원 마감입니다.">
        <FormField id="settings-recruitment-ends-at" label="모집 마감" required>
          <DateTimeInput id="settings-recruitment-ends-at" name="recruitmentEndsAt" defaultValue={koreanDateTimeLocal(recruitmentEndsAt)} required />
        </FormField>
      </FormSection>

      <FormSection title="프로젝트 투표" description="투표기간, 인당 가능 투표수, 자기 프로젝트 투표와 결과 공개 방식을 관리합니다." contentClassName="sm:grid-cols-2">
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
        <fieldset className="grid gap-3">
          <legend className="form-field__label"><UiText>{"관리자 결과 공개 방식"}</UiText></legend>
          <ChoiceCard name="identityVisibility" value="ANONYMOUS" defaultChecked={votingPolicy?.identityVisibility === "ANONYMOUS"} required={enabled} disabled={!enabled} label="익명 집계" description="관리자 결과에서 개인별 선택을 숨깁니다." />
          <ChoiceCard name="identityVisibility" value="NAMED" defaultChecked={votingPolicy?.identityVisibility === "NAMED"} required={enabled} disabled={!enabled} label="기명 집계" description="관리자 결과에서 사용자별 선택을 표시합니다." />
        </fieldset>
        <div className="sm:col-span-2">
          <ChoiceCard name="selfVotingAllowed" type="checkbox" value="true" defaultChecked={votingPolicy?.selfVotingAllowed} disabled={!enabled} label="자기 프로젝트 투표 허용" description="작성자·프로젝트 관리자·조교·팀원이 자신의 프로젝트에 투표할 수 있게 합니다." />
        </div>
      </FormSection>

      <div className="form-action-bar">
        <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
        <button type="submit" className="button-primary max-sm:w-full" disabled={pending}><UiText>{pending ? "저장 중" : "설정 저장"}</UiText></button>
      </div>
    </form>
  );
}
