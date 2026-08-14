"use client";

import { useActionState, useState } from "react";

import { saveAdvisorScoresAction, type AdvisorReviewState } from "@/app/advisor/_actions/advisor-review-actions";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiInput } from "@/modules/translation/ui/localized-elements";

const initialState: AdvisorReviewState = { status: "idle", message: "" };

export function AdvisorScoringForm({
  topicId,
  rubricId,
  title,
  criteria,
  readOnly,
}: {
  topicId: string;
  rubricId: string;
  title: string;
  criteria: Array<{ id: string; label: string; maxPoints: number; points: number | null }>;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(saveAdvisorScoresAction, initialState);
  const [points, setPoints] = useState(() => Object.fromEntries(criteria.map((criterion) => [criterion.id, criterion.points ?? 0])));
  const total = Object.values(points).reduce((sum, value) => sum + value, 0);
  const maximum = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);

  return (
    <form action={action} className="grid gap-3 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5">
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="rubricId" value={rubricId} />
      <h3 className="text-base font-bold tracking-[-0.02em]"><UiText>{title}</UiText></h3>
      {criteria.map((criterion) => (
        <label key={criterion.id} className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 text-sm">
          <span className="font-semibold">
            <UiText>{criterion.label}</UiText>
            <span className="ml-1 text-xs font-normal text-[var(--muted)]"><UiText>{`/ ${criterion.maxPoints}점`}</UiText></span>
          </span>
          <UiInput
            name={`score-${criterion.id}`}
            type="number"
            min={0}
            max={criterion.maxPoints}
            defaultValue={criterion.points ?? 0}
            required
            disabled={readOnly}
            className="form-control"
            onChange={(event) => setPoints((previous) => ({ ...previous, [criterion.id]: Number(event.target.value) || 0 }))}
          />
        </label>
      ))}
      <p className="border-t border-[var(--line)] pt-3 text-sm font-bold">
        <UiText>{"총점"}</UiText> {total} / {maximum}
      </p>
      {state.message ? (
        <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
          <UiText>{state.message}</UiText>
        </p>
      ) : null}
      {readOnly ? (
        <p className="muted text-sm"><UiText>{"채점 기간이 종료되었습니다."}</UiText></p>
      ) : (
        <div><button className="button-primary" disabled={pending}><UiText>{pending ? "저장 중" : "점수 저장"}</UiText></button></div>
      )}
    </form>
  );
}
