"use client";

import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { useActionState } from "react";

import { decideReportAction } from "@/app/teams/[teamId]/_actions/team-report-actions";
import { initialReportActionState } from "@/app/teams/[teamId]/_lib/report-form-shared";
import { CustomSelect } from "@/shared/ui/custom-select";

export function ReportDecisionForm({
  teamId,
  reportVersionId,
}: {
  teamId: string;
  reportVersionId: string;
}) {
  const [state, action, pending] = useActionState(
    decideReportAction,
    initialReportActionState,
  );

  return (
    <form
      action={action}
      className="mt-3 grid gap-2 sm:grid-cols-[11rem_minmax(0,1fr)_auto]"
    >
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="reportVersionId" value={reportVersionId} />
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"검토 결과"}</UiText><CustomSelect name="decision" defaultValue="APPROVED" options={[
          { value: "APPROVED", label: "승인" },
          { value: "REVISION_REQUESTED", label: "수정 요청" },
        ]} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        <UiText>{"검토 의견"}</UiText><UiInput
          name="comment"
          maxLength={2000}
          placeholder="수정 요청을 선택한 경우 필수"
          className="field"
        />
      </label>
      <button disabled={pending} className="button-quiet">
        <UiText>{pending ? "저장 중" : "검토 완료"}</UiText>
      </button>
      {state.message ? (
        <p
          aria-live="polite"
          className={`text-sm sm:col-span-3 ${
            state.status === "error"
              ? "text-[var(--danger)]"
              : "text-[var(--success)]"
          }`}
        >
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
    </form>
  );
}
