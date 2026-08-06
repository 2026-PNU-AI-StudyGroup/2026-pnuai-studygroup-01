"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";

import { createFeedbackPostAction } from "@/app/feedback/_actions/feedback-actions";
import {
  FEEDBACK_AREAS,
  FEEDBACK_LIMITS,
  FEEDBACK_TYPES,
  feedbackInitialState,
  TARGET_SCREENS,
} from "@/app/feedback/_lib/feedback-options";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useI18n } from "@/shared/i18n/i18n-provider";

function FieldLabel({ children }: { children: string }) {
  return <span className="text-sm font-semibold text-[var(--ink)]"><UiText>{children}</UiText></span>;
}

export function FeedbackComposer() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createFeedbackPostAction,
    feedbackInitialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--muted)]"><UiText>{"의견·버그·새 기능 제안을 자유롭게 남겨 주세요."}</UiText></p>
        <button className="button-primary" type="button" onClick={() => setOpen(true)}>
          <UiText>{"게시글 쓰기"}</UiText>
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="panel grid gap-5 p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <FieldLabel>{"작성자 이름"}</FieldLabel>
          <UiInput className="field bg-white" name="authorName" type="text" maxLength={FEEDBACK_LIMITS.name} placeholder="이름을 입력하세요" required />
        </label>
        <label className="grid gap-2">
          <FieldLabel>{"대상 화면"}</FieldLabel>
          <select className="field bg-white" name="targetScreen" defaultValue={TARGET_SCREENS[0].value} required>
            {TARGET_SCREENS.map((option) => (
              <option key={option.value} value={option.value}>{t(option.label)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <FieldLabel>{"관련 기능"}</FieldLabel>
          <select className="field bg-white" name="area" defaultValue={FEEDBACK_AREAS[0]} required>
            {FEEDBACK_AREAS.map((area) => (
              <option key={area} value={area}>{t(area)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          <FieldLabel>{"유형"}</FieldLabel>
          <select className="field bg-white" name="type" defaultValue={FEEDBACK_TYPES[0].value} required>
            {FEEDBACK_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{t(option.label)}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-2">
        <FieldLabel>{"제목"}</FieldLabel>
        <UiInput className="field bg-white" name="title" type="text" maxLength={FEEDBACK_LIMITS.title} placeholder="제목을 입력하세요" required />
      </label>
      <label className="grid gap-2">
        <FieldLabel>{"내용 (마크다운 지원)"}</FieldLabel>
        <UiTextarea className="field min-h-44 bg-white leading-7" name="body" maxLength={FEEDBACK_LIMITS.body} placeholder="무엇을 개선하면 좋을지 자유롭게 적어 주세요. 마크다운을 사용할 수 있습니다." required />
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
  );
}
