"use client";

import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiTextarea } from "@/modules/translation/ui/localized-elements";
import { useActionState } from "react";

import {
  addReportFeedbackAction,
  scoreReportAction,
} from "@/app/teams/[teamId]/_actions/team-report-actions";
import { initialReportActionState } from "@/app/teams/[teamId]/_lib/report-form-shared";

function FormMessage({ status, message }: { status: "idle" | "error" | "success"; message: string }) {
  if (!message) return null;
  return (
    <p
      role={status === "error" ? "alert" : "status"}
      className={`text-sm font-semibold ${status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
    >
      <UiText>{message}</UiText>
    </p>
  );
}

export function ReportScoreForm({
  teamId,
  reportId,
  currentScore,
  currentComment,
}: {
  teamId: string;
  reportId: string;
  currentScore?: number;
  currentComment?: string;
}) {
  const [state, action, pending] = useActionState(scoreReportAction, initialReportActionState);
  return (
    <form action={action} className="mt-3 grid gap-3 rounded-[var(--radius-control)] border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="reportId" value={reportId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          <span><UiText>{"점수"}</UiText> <span className="font-normal text-[var(--muted)]">(0–100)</span></span>
          <input
            name="score"
            type="number"
            min={0}
            max={100}
            required
            defaultValue={currentScore ?? ""}
            disabled={pending}
            className="field w-28"
          />
        </label>
        <button className="button-primary" disabled={pending}>
          <UiText>{pending ? "저장 중" : "점수 저장"}</UiText>
        </button>
      </div>
      <UiTextarea
        name="comment"
        maxLength={2000}
        rows={2}
        defaultValue={currentComment ?? ""}
        disabled={pending}
        placeholder="총평(선택)을 남겨 주세요."
        className="field resize-y"
      />
      <FormMessage status={state.status} message={state.message} />
    </form>
  );
}

export function ReportFeedbackForm({ teamId, reportId }: { teamId: string; reportId: string }) {
  const [state, action, pending] = useActionState(addReportFeedbackAction, initialReportActionState);
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="reportId" value={reportId} />
      <UiTextarea
        name="body"
        maxLength={2000}
        rows={2}
        required
        disabled={pending}
        placeholder="이 보고서에 대한 피드백을 남겨 주세요."
        className="field resize-y"
      />
      <div className="flex items-center justify-between gap-3">
        <FormMessage status={state.status} message={state.message} />
        <button className="button-secondary ml-auto" disabled={pending}>
          <UiText>{pending ? "등록 중" : "피드백 남기기"}</UiText>
        </button>
      </div>
    </form>
  );
}
