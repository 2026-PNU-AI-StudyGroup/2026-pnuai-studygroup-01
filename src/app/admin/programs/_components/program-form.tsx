"use client";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { createProgramAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { ProgramIconPicker } from "@/app/admin/programs/_components/program-icon-picker";
import { ChoiceCard, DateTimeInput, FormField, FormSection, Textarea, Toggle } from "@/shared/ui/form-system";

export function ProgramForm({ successHref }: { successHref?: string }) {
  const router = useRouter();
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [state, action, pending] = useActionState(createProgramAction, initialProgramActionState);
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  return <form action={action} aria-busy={pending} className="grid gap-4">
    <FormSection title="프로그램 정보" description="프로그램명, 분류 및 설명을 입력합니다." contentClassName="sm:grid-cols-2">
      <FormField id="program-category" label="분류">
        <UiInput id="program-category" name="category" maxLength={100} required className="form-control" placeholder="예: 캡스톤, 해커톤, 교육 프로그램" />
      </FormField>
      <FormField id="program-name" label="프로그램명" className="sm:col-span-2">
        <UiInput id="program-name" name="name" maxLength={200} required className="form-control" placeholder="예: 창의융합 해커톤" />
      </FormField>
      <FormField id="program-description" label="설명" className="sm:col-span-2">
        <Textarea id="program-description" name="description" maxLength={5000} required rows={4} />
      </FormField>
      <div className="sm:col-span-2"><ProgramIconPicker /></div>
    </FormSection>

    <FormSection title="운영 기간" description="프로그램이 실제로 운영되는 기간입니다." contentClassName="sm:grid-cols-2">
      <FormField id="program-starts-at" label="운영 시작">
        <DateTimeInput id="program-starts-at" name="startsAt" required />
      </FormField>
      <FormField id="program-ends-at" label="운영 종료">
        <DateTimeInput id="program-ends-at" name="endsAt" required />
      </FormField>
    </FormSection>

    <FormSection title="프로젝트 등록 기간" description="학생·교수·관리자가 새 프로젝트를 등록하고 최초 공개할 수 있는 기간입니다." contentClassName="sm:grid-cols-2">
      <FormField id="program-registration-starts-at" label="등록 시작" required>
        <DateTimeInput id="program-registration-starts-at" name="projectRegistrationStartsAt" required />
      </FormField>
      <FormField id="program-registration-ends-at" label="등록 종료" required>
        <DateTimeInput id="program-registration-ends-at" name="projectRegistrationEndsAt" required />
      </FormField>
    </FormSection>

    <FormSection title="프로젝트 모집 마감" description="이 프로그램의 모든 프로젝트 지원은 같은 시각에 마감됩니다.">
      <FormField id="program-recruitment-ends-at" label="모집 마감" required>
        <DateTimeInput id="program-recruitment-ends-at" name="recruitmentEndsAt" required />
      </FormField>
    </FormSection>

    <FormSection title="운영 방식" description="지도교수와 학생 제안 정책을 선택합니다.">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only"><UiText>{"지도교수 배정 여부"}</UiText></legend>
        <ChoiceCard name="advisorEnabled" value="true" required label="지도교수 있음" description="학생 프로젝트 제안은 지정한 지도교수가 검토합니다." />
        <ChoiceCard name="advisorEnabled" value="false" required label="지도교수 없음" description="지도교수 정보는 표시하지 않으며 학생 제안은 관리자가 검토합니다." />
      </fieldset>
      <ChoiceCard
        name="studentProjectCreationEnabled"
        type="checkbox"
        value="true"
        label="학생 프로젝트 제안 허용"
        description="프로그램 화면에서 학생이 프로젝트를 제안하고 검토 요청을 보낼 수 있습니다."
      />
    </FormSection>

    <FormSection title="프로젝트 투표" description="필요한 프로그램에서만 투표를 열고 투표 정책을 정합니다." contentClassName="sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Toggle
          name="votingEnabled"
          value="true"
          checked={votingEnabled}
          onChange={(event) => setVotingEnabled(event.target.checked)}
          label="프로젝트 투표 사용"
          description="활성 사용자 전체가 공개 이력이 있는 프로젝트에 투표할 수 있습니다."
        />
      </div>
      <FormField id="program-voting-starts-at" label="투표 시작" required={votingEnabled}>
        <DateTimeInput id="program-voting-starts-at" name="votingStartsAt" required={votingEnabled} disabled={!votingEnabled} />
      </FormField>
      <FormField id="program-voting-ends-at" label="투표 종료" required={votingEnabled}>
        <DateTimeInput id="program-voting-ends-at" name="votingEndsAt" required={votingEnabled} disabled={!votingEnabled} />
      </FormField>
      <FormField id="program-vote-limit" label="인당 가능 투표수" description="서로 다른 프로젝트를 최대 몇 개까지 고를지 정합니다." required={votingEnabled}>
        <UiInput id="program-vote-limit" name="voteLimit" type="number" min={1} inputMode="numeric" required={votingEnabled} disabled={!votingEnabled} className="form-control" />
      </FormField>
      <fieldset className="grid gap-3">
        <legend className="form-field__label"><UiText>{"관리자 결과 공개 방식"}</UiText></legend>
        <ChoiceCard name="identityVisibility" value="ANONYMOUS" required={votingEnabled} disabled={!votingEnabled} label="익명 집계" description="관리자 결과에서 투표자와 선택 내역을 숨깁니다." />
        <ChoiceCard name="identityVisibility" value="NAMED" required={votingEnabled} disabled={!votingEnabled} label="기명 집계" description="관리자 결과에서 사용자별 선택 내역을 확인할 수 있습니다." />
      </fieldset>
      <div className="sm:col-span-2">
        <ChoiceCard name="selfVotingAllowed" type="checkbox" value="true" disabled={!votingEnabled} label="자기 프로젝트 투표 허용" description="작성자·프로젝트 관리자·조교·팀원도 자신의 프로젝트에 투표할 수 있게 합니다." />
      </div>
    </FormSection>

    <div className="form-action-bar">
      <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
      <button type="submit" className="button-primary max-sm:w-full" disabled={pending}><UiText>{pending ? "등록 중" : "초안 등록"}</UiText></button>
    </div>
  </form>;
}
