"use client";

import { useActionState } from "react";

import {
  createAnnouncementAction,
  type AnnouncementActionState,
  updateAnnouncementAction,
} from "@/app/announcements/_actions/announcement-actions";
import { UiInput, UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const initialState: AnnouncementActionState = {
  status: "idle",
  message: "",
};

export function AnnouncementForm({
  announcementId,
  initialTitle = "",
  initialContent = "",
}: {
  announcementId?: string;
  initialTitle?: string;
  initialContent?: string;
}) {
  const action = announcementId
    ? updateAnnouncementAction.bind(null, announcementId)
    : createAnnouncementAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const editing = Boolean(announcementId);

  return (
    <form action={formAction} className="panel grid gap-6 p-6 sm:p-8">
      <label className="grid gap-2 font-semibold">
        <span><UiText>{"제목"}</UiText></span>
        <UiInput
          className="field"
          name="title"
          type="text"
          maxLength={120}
          defaultValue={initialTitle}
          placeholder="공지 제목을 입력하세요"
          required
          autoFocus
        />
      </label>
      <label className="grid gap-2 font-semibold">
        <span><UiText>{"본문"}</UiText></span>
        <UiTextarea
          className="field min-h-72 leading-7"
          name="content"
          maxLength={20_000}
          defaultValue={initialContent}
          placeholder="구성원이 알아야 할 내용을 입력하세요"
          required
        />
      </label>
      {state.message ? (
        <p
          className="text-sm font-semibold text-[var(--danger)]"
          role="alert"
        >
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
      <div className="flex justify-end">
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
