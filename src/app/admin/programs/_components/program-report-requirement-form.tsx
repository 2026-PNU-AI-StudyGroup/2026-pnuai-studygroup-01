"use client";

import { useActionState } from "react";

import {
  applyProgramReportRequirementsAction,
  type ProgramReportActionState,
} from "@/app/admin/programs/_actions/program-report-requirement-actions";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const REPORT_TYPES = [
  { key: "START", label: "착수 보고서" },
  { key: "MIDTERM", label: "중간 보고서" },
  { key: "FINAL", label: "최종 보고서" },
] as const;

const initialState: ProgramReportActionState = { status: "idle", message: "" };

export function ProgramReportRequirementForm({ programId, teamCount }: { programId: string; teamCount: number }) {
  const [state, action, pending] = useActionState(applyProgramReportRequirementsAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="programId" value={programId} />
      <div className="grid gap-3">
        {REPORT_TYPES.map((report) => (
          <div key={report.key} className="grid gap-2 rounded-[var(--radius-control)] border border-[var(--line)] px-4 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-center">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-[var(--ink)]">
              <input type="checkbox" name={`enabled_${report.key}`} value="true" />
              <span><UiText>{report.label}</UiText></span>
            </label>
            <UiInput className="form-control bg-[var(--surface)]" type="datetime-local" name={`due_${report.key}`} aria-label={report.label} />
          </div>
        ))}
      </div>
      <p className="text-sm leading-6 text-[var(--muted)]">
        <UiText>{"현재 확정된 팀"}</UiText>{" "}<strong className="tabular-nums text-[var(--ink)]">{teamCount}</strong><UiText>{"개에 적용됩니다. 체크한 보고서만 요구로 지정하고, 이후 만들어지는 팀은 다시 적용해 주세요."}</UiText>
      </p>
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-[var(--radius-control)] px-4 py-3 text-sm font-semibold ${state.status === "error" ? "bg-[var(--danger-subtle)] text-[var(--danger)]" : "bg-[var(--success-subtle)] text-[var(--success)]"}`}
        >
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
      <div>
        <button className="button-primary" type="submit" disabled={pending}>
          <UiText>{pending ? "적용 중" : "전체 팀에 적용"}</UiText>
        </button>
      </div>
    </form>
  );
}
