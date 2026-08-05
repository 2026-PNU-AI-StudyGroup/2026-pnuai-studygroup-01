"use client";

import { useActionState } from "react";

import {
  completeOnboardingAction,
  type CompleteOnboardingActionState,
} from "@/app/onboarding/_actions/complete-onboarding-action";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const initialState: CompleteOnboardingActionState = {
  status: "idle",
  message: "",
};

function Field({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 border-b border-[var(--line)] py-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
      <span>
        <label htmlFor={id} className="block text-sm font-semibold text-[var(--ink)]">
          <UiText>{label}</UiText>
        </label>
        <span id={`${id}-help`} className="mt-1 block text-xs leading-5 text-[var(--muted)]">
          <UiText>{description}</UiText>
        </span>
      </span>
      {children}
    </div>
  );
}

export function StudentOnboardingForm({
  defaultName,
}: {
  defaultName: string;
}) {
  const [state, action, pending] = useActionState(
    completeOnboardingAction,
    initialState,
  );

  return (
    <form action={action} aria-busy={pending} className="border-t border-[var(--line)]">
      <Field id="onboarding-name" label="이름" description="프로젝트와 팀에서 표시할 실명을 입력합니다.">
        <UiInput id="onboarding-name" name="name" required minLength={2} maxLength={50} autoComplete="name" defaultValue={defaultName} aria-describedby="onboarding-name-help" className="field" />
      </Field>
      <Field id="onboarding-department" label="학과" description="현재 소속 학과 또는 학부를 입력합니다.">
        <UiInput id="onboarding-department" name="department" required minLength={2} maxLength={100} autoComplete="organization" placeholder="정보컴퓨터공학부" aria-describedby="onboarding-department-help" className="field" />
      </Field>
      <Field id="onboarding-student-number" label="학번" description="학교에서 사용하는 학번을 숫자로 입력합니다.">
        <UiInput id="onboarding-student-number" name="studentNumber" required minLength={6} maxLength={12} inputMode="numeric" autoComplete="off" placeholder="202612345" aria-describedby="onboarding-student-number-help" className="field" />
      </Field>
      <Field id="onboarding-grade" label="학년" description="현재 재학 중인 학년을 선택합니다.">
        <select id="onboarding-grade" name="grade" required defaultValue="" aria-describedby="onboarding-grade-help" className="field">
          <option value="" disabled><UiText>{"학년 선택"}</UiText></option>
          {[1, 2, 3, 4, 5, 6].map((grade) => (
            <option key={grade} value={grade}>{grade}<UiText>{"학년"}</UiText></option>
          ))}
        </select>
      </Field>
      <Field id="onboarding-phone" label="휴대폰 번호" description="팀 연락에 사용할 휴대폰 번호를 입력합니다.">
        <UiInput id="onboarding-phone" name="phoneNumber" required maxLength={30} inputMode="tel" type="tel" autoComplete="tel" placeholder="010-1234-5678" aria-describedby="onboarding-phone-help" className="field" />
      </Field>
      <Field id="onboarding-email" label="자주 쓰는 이메일 주소" description="학교 메일 외에 자주 확인하는 이메일을 입력합니다.">
        <UiInput id="onboarding-email" name="contactEmail" required maxLength={254} type="email" autoComplete="email" placeholder="student@example.com" aria-describedby="onboarding-email-help" className="field" />
      </Field>

      <div className="flex flex-wrap items-center gap-4 pt-7 lg:pl-[14.5rem]">
        <button type="submit" disabled={pending} className="button-primary max-sm:w-full">
          <UiText>{pending ? "저장 중" : "가입 정보 저장"}</UiText>
        </button>
        {state.message ? (
          <p role="alert" aria-live="polite" className="text-sm font-semibold text-[var(--danger)]">
            <UiText>{state.message}</UiText>
          </p>
        ) : null}
      </div>
    </form>
  );
}
