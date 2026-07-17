"use client";

import { useActionState } from "react";

import { saveStudentProfileAction, type StudentProfileActionState } from "./actions";
import type { StudentProfile } from "@/modules/identity/domain/student-profile";

const initialState: StudentProfileActionState = { status: "idle", message: "" };

export function StudentProfileForm({ profile }: { profile: StudentProfile | null }) {
  const [state, action, pending] = useActionState(saveStudentProfileAction, initialState);
  return (
    <form action={action} className="grid gap-5 border-y border-[var(--line)] py-8 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold">관심 분야<input name="interests" required maxLength={1_000} defaultValue={profile?.interests.join(", ")} placeholder="예: 접근성, 웹 서비스, 데이터 분석" className="field" /></label>
      <label className="grid gap-2 text-sm font-semibold">보유 기술<input name="skills" required maxLength={1_000} defaultValue={profile?.skills.join(", ")} placeholder="예: TypeScript, Python, Figma" className="field" /></label>
      <label className="grid gap-2 text-sm font-semibold">희망 역할<input name="desiredRole" required maxLength={200} defaultValue={profile?.desiredRole} placeholder="예: 프론트엔드 개발과 사용자 검증" className="field" /></label>
      <label className="grid gap-2 text-sm font-semibold">활동 가능 시간<input name="availability" required maxLength={500} defaultValue={profile?.availability} placeholder="예: 평일 18시 이후, 토요일 오전" className="field" /></label>
      <label className="grid gap-2 text-sm font-semibold sm:col-span-2">자기소개<textarea name="bio" required maxLength={1_000} rows={4} defaultValue={profile?.bio} placeholder="관심 있는 문제와 프로젝트에서 기여하고 싶은 내용을 작성해 주세요." className="field" /></label>
      <button type="submit" disabled={pending} className="button-primary justify-self-start">{pending ? "저장 중" : "프로필 저장"}</button>
      {state.message ? <p role="status" aria-live="polite" className={`self-center text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>{state.message}</p> : null}
    </form>
  );
}
