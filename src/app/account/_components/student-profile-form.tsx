"use client";

import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { saveStudentProfileAction, type StudentProfileActionState } from "@/app/account/_actions/account-actions";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
import { FormField, FormSection } from "@/shared/ui/form-system";
import { TagInput } from "@/shared/ui/tag-input";

const initialState: StudentProfileActionState = { status: "idle", message: "" };

export function StudentProfileForm({ profile }: { profile: StudentProfile | null }) {
  const [state, action, pending] = useActionState(saveStudentProfileAction, initialState);
  return (
    <form action={action} aria-busy={pending} className="grid gap-4">
      <FormSection title="지원 프로필" description="팀과 프로젝트를 찾을 때 활용되는 정보입니다." contentClassName="sm:grid-cols-2">
        <FormField id="profile-interests" label="관심 분야" description="항목을 입력하고 Enter를 누르세요.">
          <TagInput id="profile-interests" name="interests" ariaLabel="관심 분야" required maxLength={1_000} defaultValue={profile?.interests} placeholder="접근성, 웹 서비스, 데이터 분석" />
        </FormField>
        <FormField id="profile-skills" label="보유 기술" description="프로젝트에서 활용할 수 있는 기술입니다.">
          <TagInput id="profile-skills" name="skills" ariaLabel="보유 기술" required maxLength={1_000} defaultValue={profile?.skills} placeholder="TypeScript, Python, Figma" />
        </FormField>
        <FormField id="profile-role" label="희망 역할" description="프로젝트에서 맡고 싶은 역할을 입력하세요.">
          <UiInput id="profile-role" name="desiredRole" required maxLength={200} defaultValue={profile?.desiredRole} placeholder="프론트엔드 개발과 사용자 검증" className="field" />
        </FormField>
        <FormField id="profile-availability" label="활동 가능 시간" description="정기적으로 참여할 수 있는 시간입니다.">
          <UiInput id="profile-availability" name="availability" required maxLength={500} defaultValue={profile?.availability} placeholder="평일 18시 이후, 토요일 오전" className="field" />
        </FormField>
        <FormField id="profile-bio" label="자기소개" description="관심 분야와 프로젝트 경험을 간단히 입력하세요." className="sm:col-span-2">
          <UiTextarea id="profile-bio" name="bio" required maxLength={1_000} rows={5} defaultValue={profile?.bio} placeholder="관심 분야와 관련 경험을 작성해 주세요." className="field resize-y" />
        </FormField>
      </FormSection>
      <div className="form-action-bar">
        <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}</div>
        <button type="submit" disabled={pending} className="button-primary max-sm:w-full"><UiText>{pending ? "저장 중" : "지원 정보 저장"}</UiText></button>
      </div>
    </form>
  );
}
