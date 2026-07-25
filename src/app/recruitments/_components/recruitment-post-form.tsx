"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { createRecruitmentPostAction } from "@/app/recruitments/_actions/recruitment-actions";
import { initialRecruitmentActionState } from "@/app/recruitments/_lib/recruitment-form-state";
import { CustomSelect } from "@/shared/ui/custom-select";

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
      className={surface === "card"
        ? "overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white"
        : "overflow-hidden bg-white"}
    >
      <fieldset className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <legend className="sr-only">프로젝트와 모집 정보</legend>
        <div>
          <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--ink)]">기본 정보</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">어떤 팀이 누구를 찾고 있는지 먼저 알려주세요.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
            내 팀
            <CustomSelect
              name="teamId"
              defaultValue={teams.some((team) => team.id === selectedTeamId) ? selectedTeamId : teams[0]?.id}
              options={teams.map((team) => ({
                value: team.id,
                label: team.name,
                description: `현재 ${team.memberCount}명`,
              }))}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
            모집 제목
            <input name="title" maxLength={200} required className="field" placeholder="필요한 역할이 드러나는 제목" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--ink)] sm:col-span-2">
            모집 내용
            <textarea name="content" maxLength={2000} rows={7} required className="field resize-y" placeholder="진행 상황, 함께할 일, 협업 방식을 구체적으로 적어주세요" />
            <span className="text-xs font-normal text-[var(--muted)]">최대 2,000자</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-6 border-t border-[var(--line)] p-6 sm:p-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <legend className="sr-only">역할과 협업 조건</legend>
        <div>
          <h2 className="text-lg font-black tracking-[-0.02em] text-[var(--ink)]">역할과 조건</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">지원자가 참여 여부를 판단할 수 있도록 구체적으로 적어주세요.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
            필요한 기술
            <input name="requiredSkills" required className="field" placeholder="예: TypeScript, Python" />
            <span className="text-xs font-normal text-[var(--muted)]">여러 기술은 쉼표로 구분합니다.</span>
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
            맡을 역할
            <input name="roleNeeded" maxLength={500} required className="field" placeholder="예: 백엔드 API 설계와 구현" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
            목표 팀원 수
            <input name="capacity" type="number" min="2" max="100" required defaultValue={4} className="field" />
            <span className="text-xs font-normal text-[var(--muted)]">현재 인원을 포함한 총원입니다.</span>
          </label>
          <label className="grid gap-2 text-sm font-bold text-[var(--ink)] sm:col-span-2">
            활동 가능 시간
            <input name="availability" maxLength={500} required className="field" placeholder="예: 화·목 18시 이후, 주 1회 대면" />
          </label>
        </div>
      </fieldset>

      <div className="flex flex-col items-start justify-between gap-4 border-t border-[var(--line)] bg-[var(--surface-subtle)] px-6 py-5 sm:flex-row sm:items-center sm:gap-5 sm:px-7">
        <p className="text-sm text-[var(--muted)]">등록 후 지원자는 내 모집에서 검토할 수 있습니다.</p>
        <button type="submit" className="button-primary shrink-0" disabled={pending}>{pending ? "등록 중" : "모집 등록"}</button>
      </div>
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`border-t border-[var(--line)] px-6 py-4 text-sm font-semibold sm:px-7 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
