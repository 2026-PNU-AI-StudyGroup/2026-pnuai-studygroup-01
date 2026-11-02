"use client";

import { useActionState } from "react";

import {
  completeOnboardingAction,
  type CompleteOnboardingActionState,
} from "@/app/onboarding/_actions/complete-onboarding-action";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
import { CustomSelect } from "@/shared/ui/custom-select";

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
    <div className="grid min-w-0 content-start gap-2">
      <span>
        <label htmlFor={id} className="block text-sm font-medium text-[var(--ink)]">
          <UiText>{label}</UiText>
        </label>
        <span id={`${id}-help`} className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">
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
    <form action={action} aria-busy={pending} aria-labelledby="student-onboarding-title" className={cardClass}>
      <CardHead id="student-onboarding-title" title={<UiText>{"학생 기본 정보"}</UiText>} />
      <div className="grid gap-x-4 gap-y-5 px-5 pb-5 pt-1 sm:grid-cols-2">
        <Field id="onboarding-name" label="이름" description="프로젝트와 팀에서 표시할 실명을 입력합니다.">
          <UiInput id="onboarding-name" name="name" required minLength={2} maxLength={50} autoComplete="name" defaultValue={defaultName} aria-describedby="onboarding-name-help" className="form-control" />
        </Field>
        <Field id="onboarding-department" label="학과" description="현재 소속 학과 또는 학부를 입력합니다.">
          <UiInput id="onboarding-department" name="department" required minLength={2} maxLength={100} autoComplete="organization" placeholder="정보컴퓨터공학부" aria-describedby="onboarding-department-help" className="form-control" />
        </Field>
        <Field id="onboarding-student-number" label="학번" description="학교에서 사용하는 학번을 숫자로 입력합니다.">
          <UiInput id="onboarding-student-number" name="studentNumber" required minLength={6} maxLength={12} inputMode="numeric" autoComplete="off" placeholder="202612345" aria-describedby="onboarding-student-number-help" className="form-control" />
        </Field>
        <Field id="onboarding-grade" label="학년" description="현재 재학 중인 학년을 선택합니다.">
          <CustomSelect
            id="onboarding-grade"
            name="grade"
            ariaLabel="학년"
            ariaDescribedBy="onboarding-grade-help"
            required
            defaultValue=""
            placeholder="학년 선택"
            options={[1, 2, 3, 4, 5, 6].map((grade) => ({ value: String(grade), label: `${grade}학년` }))}
          />
        </Field>
        <Field id="onboarding-phone" label="휴대폰 번호" description="팀 연락에 사용할 휴대폰 번호를 입력합니다.">
          <UiInput id="onboarding-phone" name="phoneNumber" required maxLength={30} inputMode="tel" type="tel" autoComplete="tel" placeholder="010-1234-5678" aria-describedby="onboarding-phone-help" className="form-control" />
        </Field>
        <Field id="onboarding-email" label="자주 쓰는 이메일 주소" description="학교 메일 외에 자주 확인하는 이메일을 입력합니다.">
          <UiInput id="onboarding-email" name="contactEmail" required maxLength={254} type="email" autoComplete="email" placeholder="student@example.com" aria-describedby="onboarding-email-help" className="form-control" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-3">
        {state.message ? (
          <p role="alert" aria-live="polite" className="min-w-0 flex-1 text-[0.8125rem] font-medium text-[var(--danger)]">
            <UiText>{state.message}</UiText>
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="button-primary button-compact max-sm:w-full">
          <UiText>{pending ? "저장 중" : "가입 정보 저장"}</UiText>
        </button>
      </div>
    </form>
  );
}
