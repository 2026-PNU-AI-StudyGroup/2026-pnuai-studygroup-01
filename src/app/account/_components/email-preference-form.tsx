"use client";

import { useActionState } from "react";

import { saveEmailPreferenceAction, type StudentProfileActionState } from "@/app/account/_actions/account-actions";
import { SaveBar } from "@/app/account/_components/account-section-layout";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiInput } from "@/modules/translation/ui/localized-elements";

const initialState: StudentProfileActionState = { status: "idle", message: "" };

type EmailPreference = { reportActivityEnabled: boolean; discussionEnabled: boolean; programActivityEnabled: boolean; deadlineEnabled: boolean };

const options: Array<{ name: keyof EmailPreference; title: string; description: string }> = [
  { name: "reportActivityEnabled", title: "보고서 제출·검토 활동", description: "보고서가 제출되거나 검토될 때 학교 이메일로 알려드립니다." },
  { name: "discussionEnabled", title: "프로젝트 토론 활동", description: "프로젝트 토론에 새 글이 등록될 때 학교 이메일로 알려드립니다." },
  { name: "programActivityEnabled", title: "프로그램 운영 알림", description: "담당 프로그램의 프로젝트 등록 검토 요청을 학교 이메일로 알려드립니다." },
  { name: "deadlineEnabled", title: "마감 알림", description: "수행 기간과 할 일, 보고서 마감이 다가올 때 학교 이메일로 알려드립니다. 여러 팀을 맡고 있으면 팀 수만큼 옵니다." },
];

export function EmailPreferenceForm({ preference }: { preference: EmailPreference | null }) {
  const [state, action, pending] = useActionState(saveEmailPreferenceAction, initialState);
  return (
    <form action={action} aria-busy={pending}>
      <fieldset className="px-5 py-1">
        <legend className="sr-only"><UiText>{"선택 이메일 수신 설정"}</UiText></legend>
        {options.map((option) => (
          <label key={option.name} className="flex cursor-pointer items-start justify-between gap-5 py-3 [&+label]:border-t [&+label]:border-[var(--line)]">
            <span className="min-w-0">
              <strong className="block text-sm font-medium text-[var(--ink)]"><UiText>{option.title}</UiText></strong>
              <span className="mt-0.5 block text-[0.8125rem] leading-5 text-[var(--muted)]"><UiText>{option.description}</UiText></span>
            </span>
            <UiInput name={option.name} type="checkbox" value="on" defaultChecked={preference?.[option.name] ?? false} className="mt-0.5 flex-none" />
          </label>
        ))}
      </fieldset>
      <SaveBar state={state} pending={pending} label="이메일 수신 설정 저장" />
    </form>
  );
}
