"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { changeUserStatusAction, type UserStatusActionState } from "@/app/admin/users/_actions/user-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: UserStatusActionState = { status: "idle", message: "" };

export function UserStatusForm({ userId, name, isActive, activeResponsibilityCount, managedByInvitations = false }: { userId: string; name: string; isActive: boolean; activeResponsibilityCount: number; managedByInvitations?: boolean }) {
  const [state, action, pending] = useActionState(changeUserStatusAction, initialState);
  // 자문위원 계정은 여기서 켜지도 끄지도 않는다. 상태가 초대에서 나오기 때문이다 -- 살아 있는
  // 초대가 하나라도 있으면 활성, 마지막 초대를 거두면 비활성이다.
  //
  // 버튼을 두면 두 축이 어긋난 상태를 만들 수 있다. 초대는 살아 있는데 계정만 꺼진 위원이
  // 심사단 목록에 남아 "참여 중인데 접속은 안 되는" 모습이 된다. 끄려면 초대를 회수해야 하고,
  // 그래야 담당 팀 배정까지 함께 정리된다.
  if (managedByInvitations) {
    return (
      <p className="text-xs text-[var(--muted)]">
        <UiText>
          {isActive
            ? "계정 상태는 프로그램 초대로 관리합니다."
            : "프로그램 자문위원 화면에서 다시 초대하면 계정도 함께 활성화됩니다."}
        </UiText>
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isActive" value={String(!isActive)} />
      {isActive ? <ConfirmSubmitButton className="button-danger button-compact" confirmMessage={`${name} 계정을 비활성화하시겠습니까? 현재 로그인된 기기에서도 모두 로그아웃됩니다.`} disabled={pending || activeResponsibilityCount > 0}><UiText>{pending ? "처리 중" : "비활성화"}</UiText></ConfirmSubmitButton> : <button className="button-secondary button-compact" disabled={pending}><UiText>{pending ? "처리 중" : "다시 활성화"}</UiText></button>}
      {isActive && activeResponsibilityCount > 0 ? <span className="basis-full text-xs text-[var(--warning-ink)]"><UiText>{`담당 프로젝트 ${activeResponsibilityCount}건을 먼저 인계하거나 마감해야 합니다.`}</UiText></span> : null}
      {state.message ? <span aria-live="polite" className={`basis-full text-xs ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></span> : null}
    </form>
  );
}
