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

export function FeedbackComposer({ signedInAs }: { signedInAs?: { name: string; email: string } }) {
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
        actions={!open && signedInAs ? (
        <button className="button-primary gap-2" type="button" onClick={() => setOpen(true)}>
          <AddIcon className="size-4 shrink-0" /><UiText>{"게시글 쓰기"}</UiText>
        </button>
        ) : undefined}
      />
      {/* 읽기는 열어 두고 글쓰기만 로그인을 받는다. 세션이 없으면 이름·메일을 가져올 데가 없다. */}
      {!signedInAs ? (
        <p role="status" className="panel p-5 text-sm text-[var(--muted)] sm:p-7">
          <UiText>{"피드백을 남기려면 로그인해 주세요. 등록된 피드백은 로그인 없이도 읽을 수 있습니다."}</UiText>
        </p>
      ) : null}
      {open && signedInAs ? (
      <form ref={formRef} action={formAction} className="panel grid gap-5 p-5 sm:p-7">
      {/* 글쓴이는 로그인 세션에서 받는다. 자유 입력이던 때는 아무나 교수 이름을 적어
          사칭할 수 있었다. 누구 이름으로 남는지 쓰기 전에 알려 준다. */}
      <p className="text-sm text-[var(--muted)]">
        <UiText>{"글쓴이"}</UiText>{" "}
        <strong className="font-semibold text-[var(--ink)]">{signedInAs?.name}</strong>
        {" "}<span className="break-all">{signedInAs?.email}</span>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
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
        <UiInput className="form-control bg-[var(--surface)]" name="title" type="text" maxLength={FEEDBACK_LIMITS.title} placeholder="제목을 입력하세요" required />
      </label>
      <label className="grid gap-2">
        <FieldLabel>{"내용 (마크다운 지원)"}</FieldLabel>
        <UiTextarea className="form-control min-h-44 bg-[var(--surface)] leading-7" name="body" maxLength={FEEDBACK_LIMITS.body} placeholder="무엇을 개선하면 좋을지 자유롭게 적어 주세요. 마크다운을 사용할 수 있습니다." required />
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
