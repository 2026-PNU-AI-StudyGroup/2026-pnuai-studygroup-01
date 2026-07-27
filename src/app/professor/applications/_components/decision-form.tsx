"use client";

import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { decideTopicApplicationAction, type DecisionActionState } from "@/app/professor/applications/_actions/received-application-actions";
import { ConfirmSubmitButton } from "@/shared/ui/confirm-submit-button";

const initialState: DecisionActionState = { status: "idle", message: "" };

export function ApplicationDecisionForm({ applicationId }: { applicationId: string }) {
  const [state, action, pending] = useActionState(decideTopicApplicationAction, initialState);

  return (
    <form action={action} className="grid w-full gap-3 sm:min-w-[28rem] sm:max-w-xl sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <input type="hidden" name="applicationId" value={applicationId} />
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"검토 의견"}</UiText><span className="font-normal text-[var(--muted)]"><UiText>{"거절 시 필수"}</UiText></span>
        <UiTextarea
          name="reviewComment"
          maxLength={2000}
          rows={3}
          disabled={pending}
          placeholder="선정 근거나 보완이 필요한 내용을 학생에게 전달하세요."
          className="field min-h-24 resize-y"
        />
      </label>
      <button name="decision" value="accept" disabled={pending} className="button-primary text-sm sm:mb-0.5"><UiText>{"수락"}</UiText></button>
      <ConfirmSubmitButton
        name="decision"
        value="reject"
        disabled={pending}
        className="button-danger text-sm sm:mb-0.5"
        confirmMessage="이 주제 지원을 거절하시겠습니까?"
      >
        <UiText>{"거절"}</UiText></ConfirmSubmitButton>
      {state.message ? (
        <p aria-live="polite" className={`text-sm sm:col-span-3 ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
