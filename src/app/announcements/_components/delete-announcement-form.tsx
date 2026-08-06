"use client";

import { useActionState } from "react";

import {
  type AnnouncementActionState,
  deleteAnnouncementAction,
} from "@/app/announcements/_actions/announcement-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: AnnouncementActionState = {
  status: "idle",
  message: "",
};

export function DeleteAnnouncementForm({
  announcementId,
}: {
  announcementId: string;
}) {
  const [state, action, pending] = useActionState(
    deleteAnnouncementAction.bind(null, announcementId),
    initialState,
  );

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <ConfirmSubmitButton
        className="button-danger"
        confirmMessage="이 공지사항을 삭제하시겠습니까? 삭제한 공지는 복구할 수 없습니다."
        disabled={pending}
      >
        <UiText>{pending ? "삭제 중" : "삭제"}</UiText>
      </ConfirmSubmitButton>
      {state.message ? (
        <p className="text-sm font-semibold text-[var(--danger)]" role="alert">
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
