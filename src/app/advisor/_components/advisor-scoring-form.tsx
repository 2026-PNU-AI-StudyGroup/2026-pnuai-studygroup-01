"use client";

import { useActionState, useState } from "react";

import { saveAdvisorScoresAction, type AdvisorReviewState } from "@/app/advisor/_actions/advisor-review-actions";
import { cardClass, Pill } from "@/modules/project-program/ui/work-screen";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiInput } from "@/modules/translation/ui/localized-elements";

const initialState: AdvisorReviewState = { status: "idle", message: "" };

/** 채점표 한 장. 항목마다 점수 칸을 오른쪽 끝에 맞춰 두고, 맨 아래 총점과 저장 버튼을 둔다. */
export function AdvisorScoringForm({
  topicId,
  rubricId,
  title,
  dueAt,
  criteria,
  readOnly,
}: {
  topicId: string;
  rubricId: string;
  title: string;
  dueAt: Date;
  criteria: Array<{ id: string; label: string; maxPoints: number; points: number | null }>;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(saveAdvisorScoresAction, initialState);
  const [points, setPoints] = useState(() => Object.fromEntries(criteria.map((criterion) => [criterion.id, criterion.points ?? 0])));
  const total = Object.values(points).reduce((sum, value) => sum + value, 0);
  const maximum = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const saved = criteria.some((criterion) => criterion.points !== null);
  const headingId = `rubric-${rubricId}-title`;

  return (
    <form action={action} aria-labelledby={headingId} className={cardClass}>
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="rubricId" value={rubricId} />
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1 px-5 pb-2.5 pt-4">
        <h2 id={headingId} className="text-base font-semibold leading-[1.375rem] text-[var(--ink)]"><UiText>{title}</UiText></h2>
        <Pill tone={saved ? "plain" : "accent"}>{saved ? "저장함" : "저장 전"}</Pill>
        <span className="ml-auto text-xs tabular-nums text-[var(--muted)]"><UiText>{"마감"}</UiText> <UiDate value={dueAt} /></span>
      </div>
      <div className="px-5">
        {criteria.map((criterion) => (
          <label key={criterion.id} className="grid grid-cols-[minmax(0,1fr)_5rem_3rem] items-center gap-3 border-t border-[var(--line)] py-2 text-[0.8125rem]">
            <span className="leading-5 text-[var(--ink)]"><UiText>{criterion.label}</UiText></span>
            <UiInput
              name={`score-${criterion.id}`}
              type="number"
              min={0}
              max={criterion.maxPoints}
              defaultValue={criterion.points ?? 0}
              required
              disabled={readOnly}
              className="form-control min-h-[2.125rem] py-1 text-right text-sm tabular-nums"
              onChange={(event) => setPoints((previous) => ({ ...previous, [criterion.id]: Number(event.target.value) || 0 }))}
            />
            <span className="text-xs tabular-nums text-[var(--muted)]"><UiText>{`/ ${criterion.maxPoints}점`}</UiText></span>
          </label>
        ))}
        <p className="grid grid-cols-[minmax(0,1fr)_5rem_3rem] items-baseline gap-3 border-t border-[var(--line-strong)] py-2.5 text-sm">
          <span className="font-medium text-[var(--ink)]"><UiText>{"총점"}</UiText></span>
          <span className="text-right font-semibold tabular-nums text-[var(--ink)]">{total}</span>
          <span className="text-xs tabular-nums text-[var(--muted)]">/ {maximum}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-3">
        {state.message ? (
          <p role={state.status === "error" ? "alert" : "status"} className={`mr-auto text-[0.8125rem] font-medium ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
            <UiText>{state.message}</UiText>
          </p>
        ) : null}
        {readOnly ? (
          <p className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"채점 기간이 종료되었습니다."}</UiText></p>
        ) : (
          <button className="button-primary button-compact" disabled={pending}><UiText>{pending ? "저장 중" : "점수 저장"}</UiText></button>
        )}
      </div>
    </form>
  );
}
