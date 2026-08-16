"use client";

import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { createRecruitmentPostAction } from "@/app/_actions/recruitment-actions";
import { initialRecruitmentActionState } from "@/app/_lib/recruitment-form-state";
import { CustomSelect } from "@/shared/ui/custom-select";
import { DateTimeInput, FormField, FormSection, TextInput } from "@/shared/ui/form-system";
import { TagInput } from "@/shared/ui/tag-input";

function koreanDateTimeLocal(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = new Map(parts.map((part) => [part.type, part.value]));
  return `${value.get("year")}-${value.get("month")}-${value.get("day")}T${value.get("hour")}:${value.get("minute")}`;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

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

  const [teamId, setTeamId] = useState(
    () => teams.some((team) => team.id === selectedTeamId) ? selectedTeamId! : (teams[0]?.id ?? "")
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [roleNeeded, setRoleNeeded] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [availability, setAvailability] = useState("");

  const [initialDefaultDeadline] = useState(() => {
    const now = new Date();
    return koreanDateTimeLocal(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
  });
  const [deadlineAt, setDeadlineAt] = useState(initialDefaultDeadline);

  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  if (!teams.length) return null;
  const now = new Date();
  const maximumDeadlineAt = addMonths(now, 1);

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
            value={teamId}
            onValueChange={setTeamId}
            options={teams.map((team) => ({
              value: team.id,
              label: team.name,
              description: `현재 ${team.memberCount}명`,
            }))}
          />
        </FormField>
        <FormField id="recruitment-title" label="모집 제목">
          <UiInput id="recruitment-title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className="form-control" placeholder="필요한 역할이 드러나는 제목" />
        </FormField>
        <FormField id="recruitment-content" label="모집 내용" description="최대 2,000자" className="sm:col-span-2">
          <UiTextarea id="recruitment-content" name="content" value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} rows={7} required className="form-control resize-y" placeholder="프로젝트 진행 상황과 담당할 작업을 구체적으로 작성해 주세요" />
        </FormField>
      </FormSection>

      <FormSection title="역할과 조건" description="지원자가 참여 여부를 판단할 수 있도록 구체적으로 작성해 주세요." contentClassName="sm:grid-cols-2">
        <FormField id="recruitment-skills" label="필요한 기술" description="항목을 입력하고 Enter를 누르세요.">
          <TagInput id="recruitment-skills" name="requiredSkills" ariaLabel="필요한 기술" value={requiredSkills} onValuesChange={setRequiredSkills} required placeholder="TypeScript, Python" />
        </FormField>
        <FormField id="recruitment-role" label="맡을 역할">
          <UiInput id="recruitment-role" name="roleNeeded" value={roleNeeded} onChange={(e) => setRoleNeeded(e.target.value)} maxLength={500} required className="form-control" placeholder="예: 백엔드 API 설계와 구현" />
        </FormField>
        <FormField id="recruitment-capacity" label="팀 정원" description="현재 인원을 포함한 총원입니다.">
          <TextInput id="recruitment-capacity" name="capacity" type="number" min="2" max="100" required value={capacity} onChange={(e) => setCapacity(Number(e.target.value) || 2)} />
        </FormField>
        <FormField id="recruitment-availability" label="활동 가능 시간">
          <UiInput id="recruitment-availability" name="availability" value={availability} onChange={(e) => setAvailability(e.target.value)} maxLength={500} required className="form-control" placeholder="예: 화·목 18시 이후, 주 1회 대면" />
        </FormField>
        <FormField id="recruitment-deadline" label="모집 마감" description="등록 시점부터 최대 1개월">
          <DateTimeInput id="recruitment-deadline" name="deadlineAt" required min={koreanDateTimeLocal(now)} max={koreanDateTimeLocal(maximumDeadlineAt)} value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)} onValueChange={setDeadlineAt} />
        </FormField>
      </FormSection>

      <div className="form-action-bar">
        <button type="submit" className="button-primary shrink-0" disabled={pending}><UiText>{pending ? "등록 중" : "모집 공고 작성"}</UiText></button>
      </div>
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`px-1 text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
