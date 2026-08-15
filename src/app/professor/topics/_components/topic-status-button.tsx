"use client";

import { useActionState } from "react";

import {
  adminProjectLifecycleAction,
  changeTopicStatusAction,
  type AdminProjectLifecycleActionState,
  type TopicStatusActionState,
} from "@/app/professor/topics/_actions/topic-management-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";
import { TextInput } from "@/shared/ui/form-system";

const initialState: TopicStatusActionState = { status: "idle", message: "" };
const initialAdminState: AdminProjectLifecycleActionState = { status: "idle", message: "" };

export function TopicStatusButton({
  topicId,
  status,
  pendingApplicationCount,
  openRecruitmentPostCount,
  recruitmentEnabled,
  canCloseRecruitment,
  isAdmin,
}: {
  topicId: string;
  status: "PENDING_APPROVAL" | "REJECTED" | "ACTIVE";
  pendingApplicationCount: number;
  openRecruitmentPostCount: number;
  recruitmentEnabled: boolean;
  canCloseRecruitment: boolean;
  isAdmin: boolean;
}) {
  const [state, action, pending] = useActionState(changeTopicStatusAction, initialState);
  const [adminState, adminAction, adminPending] = useActionState(
    adminProjectLifecycleAction,
    initialAdminState,
  );

  if (status !== "ACTIVE") {
    if (!isAdmin || status !== "REJECTED") return null;
    return (
      <AdminLifecycleForm
        action={adminAction}
        topicId={topicId}
        label="재검토 요청"
        pending={adminPending}
        message={adminState.message}
        error={adminState.status === "error"}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {recruitmentEnabled && canCloseRecruitment ? (
          <form action={action}>
            <input type="hidden" name="topicId" value={topicId} />
            <input type="hidden" name="intent" value="closeRecruitment" />
            <ConfirmSubmitButton disabled={pending} className="button-secondary text-sm" confirmMessage={`프로젝트 모집을 마감하면 검토 중인 지원 ${pendingApplicationCount}건이 자동 미선정되고 팀원 모집 글 ${openRecruitmentPostCount}건도 마감됩니다. 프로젝트 자체는 계속 진행됩니다. 이 작업은 취소할 수 없습니다. 계속하시겠습니까?`}><UiText>{pending ? "처리 중" : "모집 마감"}</UiText></ConfirmSubmitButton>
          </form>
        ) : null}
      </div>
      {state.message ? (
        <p aria-live="polite" className={`mt-2 text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </div>
  );
}

function AdminLifecycleForm({ action, topicId, label, pending, message, error }: {
  action: (payload: FormData) => void;
  topicId: string;
  label: string;
  pending: boolean;
  message: string;
  error: boolean;
}) {
  return (
    <form action={action} className="grid min-w-64 gap-2 sm:grid-cols-[minmax(12rem,1fr)_auto]">
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="intent" value="REQUEST_REVIEW" />
      <TextInput name="reason" required maxLength={1000} className="min-h-10" placeholder="변경 사유" />
      <button disabled={pending} className="button-secondary text-sm">
        <UiText>{pending ? "처리 중" : label}</UiText>
      </button>
      {message ? (
        <p aria-live="polite" className={`text-sm sm:col-span-2 ${error ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
