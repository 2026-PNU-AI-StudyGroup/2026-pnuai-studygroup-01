"use client";

import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { decideTopicApplicationAction, type DecisionActionState } from "@/app/professor/applications/_actions/received-application-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: DecisionActionState = { status: "idle", message: "" };

export function ApplicationDecisionForm({ applicationId, impact }: {
  applicationId: string;
  impact: {
    acceptedMemberCount: number;
    currentMemberCount: number;
    capacity: number;
    automaticallyRejectedApplicationCount: number;
    closesRecruitment: boolean;
  };
}) {
  const [state, action, pending] = useActionState(decideTopicApplicationAction, initialState);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <label className="grid gap-2">
        <span className="flex items-baseline justify-between gap-2 text-sm font-medium text-[var(--ink)]">
          <UiText>{"검토 의견"}</UiText><span className="text-xs font-normal text-[var(--muted)]"><UiText>{"미선정 시 필수"}</UiText></span>
        </span>
        <UiTextarea
          name="reviewComment"
          maxLength={2000}
          rows={4}
          disabled={pending}
          placeholder="선정 근거나 보완이 필요한 내용을 학생에게 전달하세요."
          className="form-control min-h-28 resize-y text-sm"
        />
      </label>
      <p className="text-xs text-[var(--muted)]"><UiText>{"선정 근거나 보완점을 남기면 결정 결과와 함께 학생에게 전달됩니다."}</UiText></p>
      {/* 되돌릴 수 없는 결정이라 두 버튼 모두 확인 창을 거친다. 미선정은 빨간 글자의 테두리 버튼으로 둔다. */}
      <div className="flex justify-end gap-2">
        <ConfirmSubmitButton
          name="decision"
          value="reject"
          disabled={pending}
          className="button-danger button-compact font-medium"
          confirmMessage="이 지원을 미선정 처리하면 되돌릴 수 없습니다. 입력한 검토 의견과 함께 결과를 전달하시겠습니까?"
        >
          <UiText>{"미선정"}</UiText></ConfirmSubmitButton>
        <ConfirmSubmitButton
          name="decision"
          value="accept"
          disabled={pending}
          className="button-primary button-compact"
          confirmMessage={`선정하면 ${impact.acceptedMemberCount}명이 팀에 추가됩니다. ${impact.automaticallyRejectedApplicationCount ? `다른 검토 중 지원 ${impact.automaticallyRejectedApplicationCount}건이 자동 미선정됩니다. ` : ""}${impact.closesRecruitment ? "정원이 충족되어 모집 글도 마감됩니다. " : ""}이 결정은 취소할 수 없습니다. 계속하시겠습니까?`}
        >
          <UiText>{"선정"}</UiText>
        </ConfirmSubmitButton>
      </div>
      {state.message ? (
        <p aria-live="polite" className={`text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
