"use client";

import { useActionState, useState } from "react";

import { changeStudentProjectCreationAction } from "@/app/topics/_management/program-actions";
import { initialProgramActionState } from "@/app/topics/_management/program-form-state";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard, FormField, FormSection, TextInput } from "@/shared/ui/form-system";

export function StudentProjectCreationForm({ id, enabled, minSize, maxSize, disabled = false }: {
  id: string;
  enabled: boolean;
  minSize: number;
  maxSize: number;
  disabled?: boolean;
}) {
  const [proposalMode, setProposalMode] = useState(enabled);
  const [state, action, pending] = useActionState(changeStudentProjectCreationAction, initialProgramActionState);
  return (
    <form action={action} aria-busy={pending}>
      <FormSection title="프로젝트 참여 방식" description="학생 팀 제안과 등록 프로젝트 직접 지원 중 한 가지 방식으로 운영합니다.">
        <input type="hidden" name="programId" value={id} />
        <fieldset className="grid gap-3">
          <legend className="sr-only"><UiText>{"프로젝트 참여 방식"}</UiText></legend>
          <ChoiceCard name="enabled" value="false" checked={!proposalMode} onChange={() => setProposalMode(false)} disabled={disabled} required label="등록 프로젝트 직접 지원" description="학생이 등록된 프로젝트에 개인 또는 팀으로 지원합니다." />
          <ChoiceCard name="enabled" value="true" checked={proposalMode} onChange={() => setProposalMode(true)} disabled={disabled} required label="학생 팀 프로젝트 제안" description="학생이 먼저 팀을 구성한 뒤 새 프로젝트를 제안합니다." />
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          {proposalMode ? (
            <FormField id="policy-project-team-min-size" label="팀 최소 인원" description="프로젝트 제안 시 필요한 확정 팀원 수입니다." required>
              <TextInput id="policy-project-team-min-size" name="projectTeamMinSize" type="number" min={1} max={100} defaultValue={minSize} disabled={disabled} required />
            </FormField>
          ) : <input type="hidden" name="projectTeamMinSize" value="1" />}
          <FormField id="policy-project-team-max-size" label={proposalMode ? "팀 최대 인원" : "팀 지원 최대 인원"} description={proposalMode ? "프로젝트를 제안할 수 있는 최대 확정 팀원 수입니다." : "한 팀이 프로젝트에 지원할 수 있는 최대 인원입니다."} required>
            <TextInput id="policy-project-team-max-size" name="projectTeamMaxSize" type="number" min={1} max={100} defaultValue={maxSize} disabled={disabled} required />
          </FormField>
        </div>
        <div className="form-action-bar mt-5">
          <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
          {disabled ? <p className="text-sm text-[var(--muted)]"><UiText>{"마감된 프로그램에서는 이 설정을 변경할 수 없습니다."}</UiText></p> : <button type="submit" className="button-secondary max-sm:w-full" disabled={pending}><UiText>{pending ? "저장 중" : "참여 방식 저장"}</UiText></button>}
        </div>
      </FormSection>
    </form>
  );
}
