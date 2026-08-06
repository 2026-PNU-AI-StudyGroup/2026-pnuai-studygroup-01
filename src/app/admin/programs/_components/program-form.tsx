"use client";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { createProgramAction } from "@/app/admin/programs/_actions/program-actions";
import { initialProgramActionState } from "@/app/admin/programs/_lib/program-form-state";
import { ChoiceCard, FormField, FormSection } from "@/shared/ui/form-system";

export function ProgramForm({ successHref }: { successHref?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createProgramAction, initialProgramActionState);
  useEffect(() => {
    if (state.status === "success" && successHref) router.replace(successHref);
  }, [router, state.status, successHref]);

  return <form action={action} aria-busy={pending} className="grid gap-4">
    <FormSection title="프로그램 정보" description="프로그램명, 분류 및 설명을 입력합니다." contentClassName="sm:grid-cols-2">
      <FormField id="program-category" label="분류">
        <UiInput id="program-category" name="category" maxLength={100} required className="field" placeholder="예: 캡스톤, 해커톤, 교육 프로그램" />
      </FormField>
      <FormField id="program-name" label="프로그램명" className="sm:col-span-2">
        <UiInput id="program-name" name="name" maxLength={200} required className="field" placeholder="예: 창의융합 해커톤" />
      </FormField>
      <FormField id="program-description" label="설명" className="sm:col-span-2">
        <textarea id="program-description" name="description" maxLength={5000} required rows={4} className="field" />
      </FormField>
    </FormSection>

    <FormSection title="운영 기간" description="프로그램이 실제로 운영되는 기간입니다." contentClassName="sm:grid-cols-2">
      <FormField id="program-starts-at" label="운영 시작">
        <input id="program-starts-at" name="startsAt" type="datetime-local" required className="field" />
      </FormField>
      <FormField id="program-ends-at" label="운영 종료">
        <input id="program-ends-at" name="endsAt" type="datetime-local" required className="field" />
      </FormField>
    </FormSection>

    <FormSection title="운영 방식" description="지도교수와 학생 제안 정책을 선택합니다.">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only"><UiText>{"지도교수 배정 여부"}</UiText></legend>
        <ChoiceCard name="advisorEnabled" value="true" required label="지도교수 있음" description="학생 프로젝트 제안은 지정한 지도교수가 검토합니다." />
        <ChoiceCard name="advisorEnabled" value="false" required label="지도교수 없음" description="지도교수 정보는 표시하지 않으며 학생 제안은 관리자가 검토합니다." />
      </fieldset>
      <ChoiceCard
        name="studentProjectCreationEnabled"
        type="checkbox"
        value="true"
        label="학생 프로젝트 제안 허용"
        description="프로그램 화면에서 학생이 프로젝트를 제안하고 검토 요청을 보낼 수 있습니다."
      />
    </FormSection>

    <div className="form-action-bar">
      <div>{state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}</div>
      <button type="submit" className="button-primary max-sm:w-full" disabled={pending}><UiText>{pending ? "등록 중" : "초안 등록"}</UiText></button>
    </div>
  </form>;
}
