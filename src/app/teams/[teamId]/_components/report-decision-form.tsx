"use client";

import { useActionState } from "react";

import { decideReportAction } from "@/app/teams/[teamId]/_actions/team-report-actions";
import { initialReportActionState } from "@/app/teams/[teamId]/_lib/report-form-shared";

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
        검토 결과
        <select name="decision" className="field" defaultValue="APPROVED">
          <option value="APPROVED">승인</option>
          <option value="REVISION_REQUESTED">수정 요청</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        검토 의견
        <input
          name="comment"
          maxLength={2000}
          placeholder="수정 요청을 선택한 경우 필수"
          className="field"
        />
      </label>
      <button disabled={pending} className="button-quiet">
        {pending ? "저장 중" : "검토 완료"}
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
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
