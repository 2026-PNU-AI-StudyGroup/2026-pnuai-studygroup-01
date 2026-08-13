"use client";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";

import { createProgramAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { CategorySelect } from "@/app/admin/programs/_components/category-select";
import { ProgramIconPicker } from "@/app/admin/programs/_components/program-icon-picker";
import { ChoiceCard, DateTimeInput, FormField, FormSection, Textarea, Toggle } from "@/shared/ui/form-system";
import { TagInput } from "@/shared/ui/tag-input";

export function ProgramForm({ successHref, categoryOptions }: { successHref?: string; categoryOptions: string[] }) {
  const router = useRouter();
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasDivisions, setHasDivisions] = useState(false);
  const [voteLimitScope, setVoteLimitScope] = useState<"PROGRAM" | "DIVISION">("PROGRAM");
  const handleDivisionChange = useCallback((values: string[]) => {
    const nextHasDivisions = values.length > 0;
    setHasDivisions(nextHasDivisions);
    if (!nextHasDivisions) setVoteLimitScope("PROGRAM");
  }, []);
  const [state, action, pending] = useActionState(createProgramAction, initialProgramActionState);
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);
  return <form action={action} aria-busy={pending} className="grid gap-4">
    <FormSection title="프로그램 정보" description="프로그램명, 분류 및 설명을 입력합니다." contentClassName="sm:grid-cols-2">
      <FormField id="program-category" label="프로그램 분류" description="목록에서 고르거나 '새 분류 추가'로 직접 넣을 수 있습니다.">
        <CategorySelect options={categoryOptions} />
      </FormField>
      <FormField id="program-name" label="프로그램명" className="sm:col-span-2">
        <UiInput id="program-name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required className="form-control" placeholder="예: 창의융합 해커톤" />
      </FormField>
      <FormField id="program-description" label="설명" className="sm:col-span-2">
        <Textarea id="program-description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} required rows={4} />
      </FormField>
      <div className="sm:col-span-2"><ProgramIconPicker /></div>
    </FormSection>

    <FormSection title="분과 설정" description="선택 사항입니다. 분과를 등록하면 새 프로젝트는 하나의 분과를 선택해야 합니다.">
      <FormField id="program-divisions" label="분과" description="이름을 입력하고 Enter를 누르세요. 비워 두면 프로젝트를 분과 없이 운영합니다." optional>
        <TagInput id="program-divisions" name="divisionNames" ariaLabel="분과" maxLength={1000} placeholder="예: 창업, 융합" onValueChange={handleDivisionChange} />
      </FormField>
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

    <FormSection title="프로그램 공통 일정" description="이 프로그램의 모든 프로젝트가 같은 모집·수행·제출 일정을 따릅니다." contentClassName="sm:grid-cols-2">
      <FormField id="program-recruitment-starts-at" label="모집 시작" required>
        <DateTimeInput id="program-recruitment-starts-at" name="recruitmentStartsAt" required />
      </FormField>
      <FormField id="program-recruitment-ends-at" label="모집 종료" required>
        <DateTimeInput id="program-recruitment-ends-at" name="recruitmentEndsAt" required />
      </FormField>
      <FormField id="program-execution-starts-at" label="수행 시작" required>
        <DateTimeInput id="program-execution-starts-at" name="executionStartsAt" required />
      </FormField>
      <FormField id="program-execution-ends-at" label="수행 종료" required>
        <DateTimeInput id="program-execution-ends-at" name="executionEndsAt" required />
      </FormField>
      <FormField id="program-submission-starts-at" label="제출 시작" required>
        <DateTimeInput id="program-submission-starts-at" name="submissionStartsAt" required />
      </FormField>
      <FormField id="program-submission-ends-at" label="제출 종료" required>
        <DateTimeInput id="program-submission-ends-at" name="submissionEndsAt" required />
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
      <fieldset className="grid gap-3 sm:col-span-2">
        <legend className="form-field__label"><UiText>{"투표 범위"}</UiText></legend>
        <ChoiceCard name="voteLimitScope" value="PROGRAM" checked={voteLimitScope === "PROGRAM"} onChange={() => setVoteLimitScope("PROGRAM")} required={votingEnabled} disabled={!votingEnabled} label="프로그램 전체" description="프로그램 전체에서 인당 N표까지 선택합니다." />
        <ChoiceCard name="voteLimitScope" value="DIVISION" checked={voteLimitScope === "DIVISION"} onChange={() => setVoteLimitScope("DIVISION")} required={votingEnabled} disabled={!votingEnabled || !hasDivisions} label="분과별" description={hasDivisions ? "각 분과에서 각각 인당 N표까지 선택합니다." : "분과를 하나 이상 추가한 뒤 선택할 수 있습니다."} />
      </fieldset>
      <fieldset className="grid gap-3">
        <legend className="form-field__label"><UiText>{"득표현황 투표자 표시"}</UiText></legend>
        <ChoiceCard name="identityVisibility" value="ANONYMOUS" required={votingEnabled} disabled={!votingEnabled} label="익명 집계" description="관리자 결과에서 투표자와 선택 내역을 숨깁니다." />
        <ChoiceCard name="identityVisibility" value="NAMED" required={votingEnabled} disabled={!votingEnabled} label="기명 집계" description="관리자 결과에서 사용자별 선택 내역을 확인할 수 있습니다." />
      </fieldset>
      <div className="sm:col-span-2">
        <ChoiceCard name="selfVotingAllowed" type="checkbox" value="true" disabled={!votingEnabled} label="자기 프로젝트 투표 허용" description="작성자·프로젝트 관리자·조교·팀원도 자신의 프로젝트에 투표할 수 있게 합니다." />
      </div>
    </FormSection>

    <FormSection title="공개" description="공개하면 학생·교수의 프로젝트 찾기 사이드바에 바로 노출됩니다. 언제든 설정에서 비공개로 되돌릴 수 있습니다.">
      <ChoiceCard
        name="publishNow"
        type="checkbox"
        value="true"
        defaultChecked
        label="만들자마자 공개"
        description="체크를 해제하면 비공개 초안으로 저장하고, 준비된 뒤 설정에서 공개할 수 있습니다."
      />
    </FormSection>

    <div className="form-action-bar">
      <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
      <button type="submit" className="button-primary max-sm:w-full" disabled={pending}><UiText>{pending ? "등록 중" : "프로그램 등록"}</UiText></button>
    </div>
  </form>;
}
