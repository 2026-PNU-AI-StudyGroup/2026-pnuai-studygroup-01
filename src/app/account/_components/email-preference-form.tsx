"use client";

import { useActionState } from "react";

import { saveEmailPreferenceAction, type StudentProfileActionState } from "@/app/account/_actions/account-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiInput } from "@/modules/translation/ui/localized-elements";

const initialState: StudentProfileActionState = { status: "idle", message: "" };

export function EmailPreferenceForm({ preference }: {
  preference: { reportActivityEnabled: boolean; discussionEnabled: boolean; programActivityEnabled: boolean } | null;
}) {
  const [state, action, pending] = useActionState(saveEmailPreferenceAction, initialState);
  return (
    <form action={action} aria-busy={pending} className="grid gap-5">
      <fieldset className="grid gap-4">
        <legend className="sr-only"><UiText>{"선택 이메일 수신 설정"}</UiText></legend>
        <label className="flex items-start justify-between gap-5 border-b border-[var(--line)] pb-4">
          <span>
            <strong className="block text-sm"><UiText>{"보고서 제출·검토 활동"}</UiText></strong>
            <span className="mt-1 block text-sm leading-6 text-[var(--muted)]"><UiText>{"보고서가 제출되거나 검토될 때 학교 이메일로 알려드립니다."}</UiText></span>
          </span>
          <UiInput name="reportActivityEnabled" type="checkbox" value="on" defaultChecked={preference?.reportActivityEnabled ?? false} className="mt-1 size-4 accent-[var(--primary)]" />
        </label>
        <label className="flex items-start justify-between gap-5 border-b border-[var(--line)] pb-4">
          <span>
            <strong className="block text-sm"><UiText>{"프로젝트 토론 활동"}</UiText></strong>
            <span className="mt-1 block text-sm leading-6 text-[var(--muted)]"><UiText>{"프로젝트 토론에 새 글이 등록될 때 학교 이메일로 알려드립니다."}</UiText></span>
          </span>
          <UiInput name="discussionEnabled" type="checkbox" value="on" defaultChecked={preference?.discussionEnabled ?? false} className="mt-1 size-4 accent-[var(--primary)]" />
        </label>
        <label className="flex items-start justify-between gap-5">
          <span>
            <strong className="block text-sm"><UiText>{"프로그램 운영 알림"}</UiText></strong>
            <span className="mt-1 block text-sm leading-6 text-[var(--muted)]"><UiText>{"담당 프로그램의 프로젝트 등록 검토 요청을 학교 이메일로 알려드립니다."}</UiText></span>
          </span>
          <UiInput name="programActivityEnabled" type="checkbox" value="on" defaultChecked={preference?.programActivityEnabled ?? true} className="mt-1 size-4 accent-[var(--primary)]" />
        </label>
      </fieldset>
      <div className="form-action-bar">
        <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}</div>
        <button type="submit" disabled={pending} className="button-primary max-sm:w-full"><UiText>{pending ? "저장 중" : "이메일 수신 설정 저장"}</UiText></button>
      </div>
    </form>
  );
}
