"use client";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { saveStudentAccountAction, type StudentProfileActionState } from "@/app/account/_actions/account-actions";
import { CustomSelect } from "@/shared/ui/custom-select";
import { FormField, FormSection } from "@/shared/ui/form-system";

const initialState: StudentProfileActionState = { status: "idle", message: "" };

export type StudentAccountInfo = {
  department: string;
  studentNumber: string;
  grade: number | null;
  contactEmail: string;
};

export function StudentAccountForm({ info }: { info: StudentAccountInfo }) {
  const [state, action, pending] = useActionState(saveStudentAccountAction, initialState);
  return (
    <form action={action} aria-busy={pending} className="grid gap-4">
      <FormSection title="학사 정보" description="가입 시 입력한 정보이며, 바뀌면 여기에서 수정할 수 있습니다." contentClassName="sm:grid-cols-2">
        <FormField id="account-department" label="학과" description="현재 소속 학과 또는 학부입니다.">
          <UiInput id="account-department" name="department" required minLength={2} maxLength={100} defaultValue={info.department} placeholder="정보컴퓨터공학부" className="form-control" />
        </FormField>
        <FormField id="account-student-number" label="학번" description="숫자만 입력합니다.">
          <UiInput id="account-student-number" name="studentNumber" required minLength={6} maxLength={12} inputMode="numeric" pattern="[0-9]*" defaultValue={info.studentNumber} placeholder="202612345" className="form-control" />
        </FormField>
        <FormField id="account-grade" label="학년" description="현재 재학 중인 학년입니다.">
          <CustomSelect
            id="account-grade"
            name="grade"
            ariaLabel="학년"
            required
            defaultValue={info.grade ? String(info.grade) : ""}
            placeholder="학년 선택"
            options={[1, 2, 3, 4, 5, 6].map((grade) => ({ value: String(grade), label: `${grade}학년` }))}
          />
        </FormField>
        <FormField id="account-contact-email" label="자주 쓰는 이메일 주소" description="학교 메일 외에 자주 확인하는 이메일입니다.">
          <UiInput id="account-contact-email" name="contactEmail" required type="email" maxLength={254} defaultValue={info.contactEmail} placeholder="student@example.com" className="form-control" />
        </FormField>
      </FormSection>
      <div className="form-action-bar">
        <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}</div>
        <button type="submit" disabled={pending} className="button-primary max-sm:w-full"><UiText>{pending ? "저장 중" : "학사 정보 저장"}</UiText></button>
      </div>
    </form>
  );
}
