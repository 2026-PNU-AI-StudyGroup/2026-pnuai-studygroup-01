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
    <form action={action} className="grid w-full gap-3 sm:min-w-[28rem] sm:max-w-xl sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <input type="hidden" name="applicationId" value={applicationId} />
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"검토 의견"}</UiText><span className="font-normal text-[var(--muted)]"><UiText>{"미선정 시 필수"}</UiText></span>
        <UiTextarea
          name="reviewComment"
          maxLength={2000}
          rows={3}
          disabled={pending}
          placeholder="선정 근거나 보완이 필요한 내용을 학생에게 전달하세요."
          className="form-control min-h-24 resize-y"
        />
      </label>
      <ConfirmSubmitButton
        name="decision"
        value="accept"
        disabled={pending}
        className="button-primary text-sm sm:mb-0.5"
        confirmMessage={`선정하면 ${impact.acceptedMemberCount}명이 팀에 추가됩니다. ${impact.automaticallyRejectedApplicationCount ? `다른 검토 중 지원 ${impact.automaticallyRejectedApplicationCount}건이 자동 미선정됩니다. ` : ""}${impact.closesRecruitment ? "정원이 충족되어 모집 글도 마감됩니다. " : ""}이 결정은 취소할 수 없습니다. 계속하시겠습니까?`}
      >
        <UiText>{"선정"}</UiText>
      </ConfirmSubmitButton>
      <ConfirmSubmitButton
        name="decision"
        value="reject"
        disabled={pending}
        className="button-danger text-sm sm:mb-0.5"
        confirmMessage="이 지원을 미선정 처리하면 되돌릴 수 없습니다. 입력한 검토 의견과 함께 결과를 전달하시겠습니까?"
      >
        <UiText>{"미선정"}</UiText></ConfirmSubmitButton>
      {state.message ? (
        <p aria-live="polite" className={`text-sm sm:col-span-3 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
