"use client";

import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { saveStudentProfileAction, type StudentProfileActionState } from "@/app/account/_actions/account-actions";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";

const initialState: StudentProfileActionState = { status: "idle", message: "" };

export function StudentProfileForm({ profile }: { profile: StudentProfile | null }) {
  const [state, action, pending] = useActionState(saveStudentProfileAction, initialState);
  return (
    <form action={action} aria-busy={pending} className="border-b border-[var(--line)]">
      <div className="grid gap-3 border-b border-[var(--line)] py-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <span>
          <label htmlFor="profile-interests" className="block text-sm font-semibold"><UiText>{"관심 분야"}</UiText></label>
          <span id="profile-interests-help" className="mt-1 block text-xs font-normal leading-5 text-[var(--muted)]"><UiText>{"쉼표로 여러 항목을 구분합니다."}</UiText></span>
        </span>
        <UiInput id="profile-interests" aria-describedby="profile-interests-help" name="interests" required maxLength={1_000} defaultValue={profile?.interests.join(", ")} placeholder="접근성, 웹 서비스, 데이터 분석" className="field" />
      </div>
      <div className="grid gap-3 border-b border-[var(--line)] py-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <span>
          <label htmlFor="profile-skills" className="block text-sm font-semibold"><UiText>{"보유 기술"}</UiText></label>
          <span id="profile-skills-help" className="mt-1 block text-xs font-normal leading-5 text-[var(--muted)]"><UiText>{"프로젝트에서 활용할 수 있는 기술을 적습니다."}</UiText></span>
        </span>
        <input id="profile-skills" aria-describedby="profile-skills-help" name="skills" required maxLength={1_000} defaultValue={profile?.skills.join(", ")} placeholder="TypeScript, Python, Figma" className="field" />
      </div>
      <div className="grid gap-3 border-b border-[var(--line)] py-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <span>
          <label htmlFor="profile-role" className="block text-sm font-semibold"><UiText>{"희망 역할"}</UiText></label>
          <span id="profile-role-help" className="mt-1 block text-xs font-normal leading-5 text-[var(--muted)]"><UiText>{"맡고 싶은 책임과 기여 방식을 알려주세요."}</UiText></span>
        </span>
        <UiInput id="profile-role" aria-describedby="profile-role-help" name="desiredRole" required maxLength={200} defaultValue={profile?.desiredRole} placeholder="프론트엔드 개발과 사용자 검증" className="field" />
      </div>
      <div className="grid gap-3 border-b border-[var(--line)] py-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <span>
          <label htmlFor="profile-availability" className="block text-sm font-semibold"><UiText>{"활동 가능 시간"}</UiText></label>
          <span id="profile-availability-help" className="mt-1 block text-xs font-normal leading-5 text-[var(--muted)]"><UiText>{"정기적으로 참여할 수 있는 시간을 적습니다."}</UiText></span>
        </span>
        <UiInput id="profile-availability" aria-describedby="profile-availability-help" name="availability" required maxLength={500} defaultValue={profile?.availability} placeholder="평일 18시 이후, 토요일 오전" className="field" />
      </div>
      <div className="grid gap-3 border-b border-[var(--line)] py-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <span>
          <label htmlFor="profile-bio" className="block text-sm font-semibold"><UiText>{"자기소개"}</UiText></label>
          <span id="profile-bio-help" className="mt-1 block text-xs font-normal leading-5 text-[var(--muted)]"><UiText>{"관심 있는 문제와 협업 방식을 간결하게 소개합니다."}</UiText></span>
        </span>
        <UiTextarea id="profile-bio" aria-describedby="profile-bio-help" name="bio" required maxLength={1_000} rows={5} defaultValue={profile?.bio} placeholder="프로젝트에서 해결하고 싶은 문제와 기여하고 싶은 내용을 작성해 주세요." className="field resize-y" />
      </div>
      <div className="flex flex-wrap items-center gap-4 py-7 lg:pl-[16rem]">
        <button type="submit" disabled={pending} className="button-primary max-sm:w-full"><UiText>{pending ? "저장 중" : "프로필 저장"}</UiText></button>
        {state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
      </div>
    </form>
  );
}
