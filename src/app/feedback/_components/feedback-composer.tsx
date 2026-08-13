"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";

import { createFeedbackPostAction } from "@/app/feedback/_actions/feedback-actions";
import {
  FEEDBACK_AREAS,
  FEEDBACK_LIMITS,
  FEEDBACK_PRIORITIES,
  FEEDBACK_TYPES,
  feedbackInitialState,
  TARGET_SCREENS,
} from "@/app/feedback/_lib/feedback-options";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";
import { ChoiceCard, FormField } from "@/shared/ui/form-system";
import { PageHeader } from "@/shared/ui/page-primitives";
import { AddIcon } from "@/shared/ui/workspace-icons";

function FieldLabel({ children }: { children: string }) {
  return <span className="text-sm font-semibold text-[var(--ink)]"><UiText>{children}</UiText></span>;
}

export function FeedbackComposer() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createFeedbackPostAction,
    feedbackInitialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <>
      <PageHeader
        title="피드백 게시판"
        actions={!open ? (
        <button className="button-primary gap-2" type="button" onClick={() => setOpen(true)}>
          <AddIcon className="size-4 shrink-0" /><UiText>{"게시글 쓰기"}</UiText>
        </button>
        ) : undefined}
      />
      {open ? (
      <form ref={formRef} action={formAction} className="panel grid gap-5 p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel>{"작성자 이름"}</FieldLabel>
          <UiInput className="form-control bg-white" name="authorName" type="text" maxLength={FEEDBACK_LIMITS.name} placeholder="이름을 입력하세요" required />
        </label>
        <FormField label="대상 화면" required>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only"><UiText>{"대상 화면"}</UiText></legend>
            {TARGET_SCREENS.map((option, index) => (
              <ChoiceCard key={option.value} name="targetScreen" value={option.value} defaultChecked={index === 0} label={option.label} className="min-h-0 px-3 py-2" />
            ))}
          </fieldset>
        </FormField>
        <FormField label="관련 기능" required>
          <CustomSelect name="area" ariaLabel="관련 기능" searchable defaultValue={FEEDBACK_AREAS[0]} options={FEEDBACK_AREAS.map((area) => ({ value: area, label: area }))} />
        </FormField>
        <FormField label="유형" required>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only"><UiText>{"유형"}</UiText></legend>
            {FEEDBACK_TYPES.map((option, index) => (
              <ChoiceCard key={option.value} name="type" value={option.value} defaultChecked={index === 0} label={option.label} className="min-h-0 px-3 py-2" />
            ))}
          </fieldset>
        </FormField>
        <FormField label="우선순위" required className="sm:col-span-2">
          <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <legend className="sr-only"><UiText>{"우선순위"}</UiText></legend>
            {FEEDBACK_PRIORITIES.map((option) => (
              <ChoiceCard key={option.value} name="priority" value={option.value} defaultChecked={option.value === "NORMAL"} label={option.label} className="min-h-0 px-3 py-2" />
            ))}
          </fieldset>
        </FormField>
      </div>
      <label className="grid gap-2">
        <FieldLabel>{"제목"}</FieldLabel>
        <UiInput className="form-control bg-white" name="title" type="text" maxLength={FEEDBACK_LIMITS.title} placeholder="제목을 입력하세요" required />
      </label>
      <label className="grid gap-2">
        <FieldLabel>{"내용 (마크다운 지원)"}</FieldLabel>
        <UiTextarea className="form-control min-h-44 bg-white leading-7" name="body" maxLength={FEEDBACK_LIMITS.body} placeholder="무엇을 개선하면 좋을지 자유롭게 적어 주세요. 마크다운을 사용할 수 있습니다." required />
      </label>

      {state.message ? (
        <p
          className={`rounded-[var(--radius-control)] px-4 py-3 text-sm font-semibold ${state.status === "error" ? "bg-[var(--danger-subtle)] text-[var(--danger)]" : "bg-[var(--success-subtle)] text-[var(--success)]"}`}
          role="status"
        >
          <UiText>{state.message}</UiText>
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <button className="button-secondary" type="button" onClick={() => setOpen(false)}>
          <UiText>{"닫기"}</UiText>
        </button>
        <button className="button-primary" type="submit" disabled={pending}>
          <UiText>{pending ? "등록 중" : "등록"}</UiText>
        </button>
      </div>
      </form>
      ) : null}
    </>
  );
}
