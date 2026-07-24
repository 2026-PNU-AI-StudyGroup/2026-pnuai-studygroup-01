"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { createRecruitmentPostAction } from "@/app/recruitments/_actions/recruitment-actions";
import { initialRecruitmentActionState } from "@/app/recruitments/_lib/recruitment-form-state";

export function RecruitmentPostForm({
  teams,
  successHref,
}: {
  teams: Array<{ id: string; name: string }>;
  successHref?: string;
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
    <form action={action} aria-busy={pending} className="space-y-5">
      <fieldset className="grid gap-5 rounded-[var(--radius-panel)] border border-white bg-white/86 p-5 shadow-[0_18px_45px_rgba(23,32,51,.08)] backdrop-blur sm:grid-cols-2 sm:p-7">
        <legend className="mb-1 w-full px-1 text-lg font-black text-[var(--ink)]">
          <span className="mr-3 inline-grid size-8 place-items-center rounded-full bg-[var(--primary)] text-sm text-white">1</span>
          프로젝트와 모집
        </legend>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
          프로젝트 팀
          <select name="teamId" className="field">
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
          제목
          <input name="title" maxLength={200} required className="field" placeholder="필요한 역할이 드러나는 제목을 입력하세요" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)] sm:col-span-2">
          함께할 사람에게 전할 내용
          <textarea name="content" maxLength={2000} rows={6} required className="field resize-y" placeholder="지금까지의 진행 상황과 함께할 일, 협업 방식을 알려주세요" />
          <span className="muted text-xs font-normal">최대 2,000자</span>
        </label>
      </fieldset>
      <fieldset className="grid gap-5 rounded-[var(--radius-panel)] border border-white bg-white/86 p-5 shadow-[0_18px_45px_rgba(23,32,51,.08)] backdrop-blur sm:grid-cols-2 sm:p-7">
        <legend className="mb-1 w-full px-1 text-lg font-black text-[var(--ink)]">
          <span className="mr-3 inline-grid size-8 place-items-center rounded-full bg-[var(--primary)] text-sm text-white">2</span>
          함께할 방식
        </legend>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
          필요한 기술
          <input name="requiredSkills" required className="field" placeholder="예: TypeScript, Python" />
          <span className="muted text-xs font-normal">여러 기술은 쉼표로 구분합니다.</span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
          맡을 역할
          <input name="roleNeeded" maxLength={500} required className="field" placeholder="예: 백엔드 API 설계와 구현" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)] sm:col-span-2">
          함께할 시간
          <input name="availability" maxLength={500} required className="field" placeholder="예: 화·목 18시 이후, 주 1회 대면" />
        </label>
      </fieldset>
      <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface-subtle)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-sm text-[var(--muted)]">지원자는 ‘내 모집’에서 확인할 수 있습니다.</p>
        <button type="submit" className="button-primary max-sm:w-full" disabled={pending}>{pending ? "공개 중" : "모집 시작하기"}</button>
      </div>
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
