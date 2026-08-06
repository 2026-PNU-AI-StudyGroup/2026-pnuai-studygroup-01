"use client";

import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { createRecruitmentPostAction } from "@/app/recruitments/_actions/recruitment-actions";
import { initialRecruitmentActionState } from "@/app/recruitments/_lib/recruitment-form-state";
import { CustomSelect } from "@/shared/ui/custom-select";
import { FormField, FormSection } from "@/shared/ui/form-system";
import { TagInput } from "@/shared/ui/tag-input";

export function RecruitmentPostForm({
  teams,
  selectedTeamId,
  successHref,
  surface = "card",
}: {
  teams: Array<{ id: string; name: string; memberCount: number }>;
  selectedTeamId?: string;
  successHref?: string;
  surface?: "card" | "embedded";
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createRecruitmentPostAction,
    initialRecruitmentActionState,
  );

  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  if (!teams.length) return null;

  return (
    <form
      action={action}
      aria-busy={pending}
      className={`grid gap-4 ${surface === "embedded" ? "" : "rounded-[var(--radius-panel)]"}`}
    >
      <FormSection title="기본 정보" description="어떤 팀이 누구를 찾고 있는지 알려주세요." contentClassName="sm:grid-cols-2">
        <FormField id="recruitment-team" label="내 팀">
          <CustomSelect
            id="recruitment-team"
            name="teamId"
            ariaLabel="내 팀"
            defaultValue={teams.some((team) => team.id === selectedTeamId) ? selectedTeamId : teams[0]?.id}
            options={teams.map((team) => ({
              value: team.id,
              label: team.name,
              description: `현재 ${team.memberCount}명`,
            }))}
          />
        </FormField>
        <FormField id="recruitment-title" label="모집 제목">
          <UiInput id="recruitment-title" name="title" maxLength={200} required className="field" placeholder="필요한 역할이 드러나는 제목" />
        </FormField>
        <FormField id="recruitment-content" label="모집 내용" description="최대 2,000자" className="sm:col-span-2">
          <UiTextarea id="recruitment-content" name="content" maxLength={2000} rows={7} required className="field resize-y" placeholder="프로젝트 진행 상황과 담당할 작업을 구체적으로 작성해 주세요" />
        </FormField>
      </FormSection>

      <FormSection title="역할과 조건" description="지원자가 참여 여부를 판단할 수 있도록 구체적으로 작성해 주세요." contentClassName="sm:grid-cols-2">
        <FormField id="recruitment-skills" label="필요한 기술" description="항목을 입력하고 Enter를 누르세요.">
          <TagInput id="recruitment-skills" name="requiredSkills" ariaLabel="필요한 기술" required placeholder="TypeScript, Python" />
        </FormField>
        <FormField id="recruitment-role" label="맡을 역할">
          <UiInput id="recruitment-role" name="roleNeeded" maxLength={500} required className="field" placeholder="예: 백엔드 API 설계와 구현" />
        </FormField>
        <FormField id="recruitment-capacity" label="팀 정원" description="현재 인원을 포함한 총원입니다.">
          <input id="recruitment-capacity" name="capacity" type="number" min="2" max="100" required defaultValue={4} className="field" />
        </FormField>
        <FormField id="recruitment-availability" label="활동 가능 시간">
          <UiInput id="recruitment-availability" name="availability" maxLength={500} required className="field" placeholder="예: 화·목 18시 이후, 주 1회 대면" />
        </FormField>
      </FormSection>

      <div className="form-action-bar">
        <p className="text-sm text-[var(--muted)]"><UiText>{"등록 후 지원자는 내 모집에서 검토할 수 있습니다."}</UiText></p>
        <button type="submit" className="button-primary shrink-0" disabled={pending}><UiText>{pending ? "등록 중" : "모집 등록"}</UiText></button>
      </div>
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`px-1 text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
