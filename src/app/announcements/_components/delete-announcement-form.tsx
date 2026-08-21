"use client";

import { useActionState } from "react";

import {
  type AnnouncementActionState,
  deleteAnnouncementAction,
} from "@/app/announcements/_actions/announcement-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { iconControlClassName } from "@/shared/ui/icon-button";
import { TrashIcon } from "@/shared/ui/workspace-icons";

const initialState: AnnouncementActionState = {
  status: "idle",
  message: "",
};

export function DeleteAnnouncementForm({
  announcementId,
  returnHref,
  iconOnly = false,
}: {
  announcementId: string;
  returnHref?: string;
  iconOnly?: boolean;
}) {
  const [state, action, pending] = useActionState(
    deleteAnnouncementAction.bind(null, announcementId),
    initialState,
  );

  return (
    <form action={action} className="flex flex-col items-end gap-1.5">
      {returnHref ? <input type="hidden" name="returnTo" value={returnHref} /> : null}
      <ConfirmSubmitButton
        className={iconOnly ? `${iconControlClassName} text-[var(--danger)] hover:text-[var(--danger)]` : "button-danger button-compact gap-1.5"}
        aria-label={iconOnly ? "공지 삭제" : undefined}
        title={iconOnly ? "공지 삭제" : undefined}
        confirmMessage="이 공지사항을 삭제하시겠습니까? 삭제한 공지는 복구할 수 없습니다."
        disabled={pending}
      >
        {iconOnly ? <TrashIcon className="size-5" /> : <><TrashIcon className="size-4 shrink-0" /><UiText>{pending ? "삭제 중" : "삭제"}</UiText></>}
      </ConfirmSubmitButton>
      {state.message ? (
        <p className="text-sm font-semibold text-[var(--danger)]" role="alert">
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
