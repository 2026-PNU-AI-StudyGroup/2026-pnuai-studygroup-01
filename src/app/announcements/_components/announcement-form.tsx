"use client";

import { useActionState } from "react";

import {
  createAnnouncementAction,
  type AnnouncementActionState,
  updateAnnouncementAction,
} from "@/app/announcements/_actions/announcement-actions";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
} from "@/app/announcements/_lib/announcement-categories";
import type { AnnouncementCategory } from "@/modules/announcement/application/announcement-ports";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { CustomSelect } from "@/shared/ui/custom-select";

const CATEGORY_OPTIONS = ANNOUNCEMENT_CATEGORIES.map((value) => ({
  value,
  label: ANNOUNCEMENT_CATEGORY_LABELS[value],
}));

const initialState: AnnouncementActionState = {
  status: "idle",
  message: "",
};

export function AnnouncementForm({
  announcementId,
  initialTitle = "",
  initialContent = "",
  initialCategory = "GENERAL",
  initialPinned = false,
}: {
  announcementId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialCategory?: AnnouncementCategory;
  initialPinned?: boolean;
}) {
  const action = announcementId
    ? updateAnnouncementAction.bind(null, announcementId)
    : createAnnouncementAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const editing = Boolean(announcementId);

  return (
    <form action={formAction} className="panel overflow-hidden">
      <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8">
        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"분류"}</UiText></span>
          <CustomSelect
            name="category"
            ariaLabel="공지 분류"
            options={CATEGORY_OPTIONS}
            defaultValue={initialCategory}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"제목"}</UiText></span>
          <UiInput
            className="form-control bg-[var(--surface)]"
            name="title"
            type="text"
            maxLength={120}
            defaultValue={initialTitle}
            placeholder="공지 제목을 입력하세요"
            required
            autoFocus
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
          <span><UiText>{"본문"}</UiText></span>
          <UiTextarea
            className="form-control min-h-80 bg-[var(--surface)] leading-7"
            name="content"
            maxLength={20_000}
            defaultValue={initialContent}
            placeholder="구성원이 알아야 할 내용을 입력하세요"
            required
          />
        </label>
        <label className="flex items-center gap-2.5 text-sm font-semibold text-[var(--ink)]">
          <input type="checkbox" name="pinned" defaultChecked={initialPinned} />
          <span><UiText>{"목록 상단에 고정"}</UiText></span>
        </label>
        {state.message ? (
          <p
            className="rounded-[var(--radius-control)] bg-[var(--danger-subtle)] px-4 py-3 text-sm font-semibold text-[var(--danger)]"
            role="alert"
          >
            <UiText>{state.message}</UiText>
          </p>
        ) : null}
      </div>
      <div className="flex justify-end border-t border-[var(--line)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-8">
        <button
          className="button-primary max-sm:w-full"
          type="submit"
          disabled={pending}
        >
          <UiText>{pending
            ? editing ? "수정 중" : "등록 중"
            : editing ? "수정 완료" : "공지 등록"}</UiText>
        </button>
      </div>
    </form>
  );
}
