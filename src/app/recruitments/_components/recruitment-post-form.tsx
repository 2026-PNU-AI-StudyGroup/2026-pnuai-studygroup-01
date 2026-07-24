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
    <form action={action} aria-busy={pending} className="space-y-8">
      <fieldset className="grid gap-5 border-0 p-0 sm:grid-cols-2">
        <legend className="mb-5 w-full border-b border-[var(--line)] pb-3 text-lg font-black text-[var(--ink)]">
          모집 기본 정보
        </legend>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
          모집할 팀
          <select name="teamId" className="field">
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
          모집 제목
          <input name="title" maxLength={200} required className="field" placeholder="필요한 역할이 드러나는 제목을 입력하세요" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)] sm:col-span-2">
          모집 내용
          <textarea name="content" maxLength={2000} rows={6} required className="field resize-y" placeholder="프로젝트 상황, 함께할 업무, 협업 방식을 적어 주세요" />
          <span className="muted text-xs font-normal">최대 2,000자</span>
        </label>
      </fieldset>
      <fieldset className="grid gap-5 border-0 p-0 sm:grid-cols-2">
        <legend className="mb-5 w-full border-b border-[var(--line)] pb-3 text-lg font-black text-[var(--ink)]">
          함께할 조건
        </legend>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
          필요 기술
          <input name="requiredSkills" required className="field" placeholder="예: TypeScript, Python" />
          <span className="muted text-xs font-normal">여러 기술은 쉼표로 구분합니다.</span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)]">
          필요 역할
          <input name="roleNeeded" maxLength={500} required className="field" placeholder="예: 백엔드 API 설계와 구현" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--ink)] sm:col-span-2">
          활동 가능 시간
          <input name="availability" maxLength={500} required className="field" placeholder="예: 화·목 18시 이후, 주 1회 대면" />
        </label>
      </fieldset>
      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="muted text-sm">등록 후 들어온 지원은 ‘작성한 모집’에서 검토합니다.</p>
        <button type="submit" className="button-primary" disabled={pending}>{pending ? "등록 중" : "모집 글 등록"}</button>
      </div>
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
