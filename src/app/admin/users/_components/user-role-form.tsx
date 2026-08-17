"use client";

import { useActionState } from "react";

import { changeAdminRoleAction, type UserStatusActionState } from "@/app/admin/users/_actions/user-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: UserStatusActionState = { status: "idle", message: "" };

export function UserRoleForm({ userId, name, role, isSelf }: {
  userId: string;
  name: string;
  role: "STUDENT" | "PROFESSOR" | "ADMIN" | "ADVISOR";
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState(changeAdminRoleAction, initialState);
  const isAdmin = role === "ADMIN";
  // 자문위원은 교외 인원이라 운영 권한 대상이 아니고, 본인 계정은 잠금을 막기 위해 해제할 수 없다.
  if (role === "ADVISOR" || (isAdmin && isSelf)) return null;

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 sm:justify-end">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isAdmin" value={String(!isAdmin)} />
      {isAdmin ? (
        <ConfirmSubmitButton
          className="button-secondary"
          confirmMessage={`${name} 계정의 관리자 권한을 해제하시겠습니까? 로그인 상태도 종료됩니다.`}
          disabled={pending}
        >
          <UiText>{pending ? "처리 중" : "관리자 해제"}</UiText>
        </ConfirmSubmitButton>
      ) : (
        <ConfirmSubmitButton
          className="button-secondary"
          confirmMessage={`${name} 계정에 관리자 권한을 부여하시겠습니까? 프로그램, 사용자와 운영 설정 전체를 관리할 수 있게 됩니다.`}
          disabled={pending}
        >
          <UiText>{pending ? "처리 중" : "관리자 지정"}</UiText>
        </ConfirmSubmitButton>
      )}
      {state.message ? (
        <span aria-live="polite" className={`basis-full text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </span>
      ) : null}
    </form>
  );
}
