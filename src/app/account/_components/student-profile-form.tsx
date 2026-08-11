"use client";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { saveStudentProfileAction, type StudentProfileActionState } from "@/app/account/_actions/account-actions";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";
import { FormField, FormSection } from "@/shared/ui/form-system";

const initialState: StudentProfileActionState = { status: "idle", message: "" };

export function StudentProfileForm({ profile }: { profile: StudentProfile | null }) {
  const [state, action, pending] = useActionState(saveStudentProfileAction, initialState);
  return (
    <form action={action} aria-busy={pending} className="grid gap-4">
      <FormSection title="연락처" description="운영진과 같은 팀 팀원이 사이트 안에서 연락할 때 사용됩니다." contentClassName="sm:grid-cols-2">
        <FormField id="profile-phone" label="전화번호" description="교육원·교수·조교가 연락할 때 사용합니다.">
          <UiInput id="profile-phone" name="phone" type="tel" inputMode="numeric" pattern="[0-9 +()-]*" title="숫자와 + - ( ) 만 입력하세요" maxLength={40} defaultValue={profile?.phone} placeholder="010-1234-5678" className="form-control" />
        </FormField>
        <FormField id="profile-kakao" label="카카오톡 / 오픈채팅" description="ID 또는 오픈채팅 링크를 입력하세요.">
          <UiInput id="profile-kakao" name="kakao" pattern="[!-~]*" title="공백·한글 없이 영문 ID나 링크로 입력하세요" maxLength={200} defaultValue={profile?.kakao} placeholder="카카오 ID 또는 https://open.kakao.com/..." className="form-control" />
        </FormField>
        <FormField id="profile-github" label="GitHub" description="프로필 주소 또는 사용자명입니다.">
          <UiInput id="profile-github" name="github" pattern="[!-~]*" title="공백·한글 없이 영문 ID나 링크로 입력하세요" maxLength={200} defaultValue={profile?.github} placeholder="https://github.com/username" className="form-control" />
        </FormField>
        <FormField id="profile-instagram" label="Instagram" description="프로필 주소 또는 사용자명입니다.">
          <UiInput id="profile-instagram" name="instagram" pattern="[!-~]*" title="공백·한글 없이 영문 ID나 링크로 입력하세요" maxLength={200} defaultValue={profile?.instagram} placeholder="https://instagram.com/username" className="form-control" />
        </FormField>
      </FormSection>
      <div className="form-action-bar">
        <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}</div>
        <button type="submit" disabled={pending} className="button-primary max-sm:w-full"><UiText>{pending ? "저장 중" : "연락처 저장"}</UiText></button>
      </div>
    </form>
  );
}
