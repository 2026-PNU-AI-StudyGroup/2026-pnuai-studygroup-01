"use client";

import { useActionState, useId } from "react";

import {
  saveRubricScoresAction,
  toggleRubricReleaseAction,
  type RubricScoreState,
} from "@/app/teams/[teamId]/_actions/rubric-actions";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { StatusBadge } from "@/shared/ui/page-primitives";

const rubricScoreInitialState: RubricScoreState = { status: "idle", message: "" };

type RubricCriterionScore = { id: string; label: string; maxPoints: number; points: number | null };

export type ReportRubricView = {
  criteria: RubricCriterionScore[];
  released: boolean;
  releasedByName: string | null;
};

function Notice({ state }: { state: { status: string; message: string } }) {
  if (!state.message) return null;
  return (
    <span className={`text-xs font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`} role="status">
      <UiText>{state.message}</UiText>
    </span>
  );
}

export function RubricSection({
  reportId,
  teamId,
  rubric,
  canEvaluate,
  canRelease,
}: {
  reportId: string;
  teamId: string;
  rubric: ReportRubricView;
  canEvaluate: boolean;
  canRelease: boolean;
}) {
  const headingId = useId();
  const saveAction = saveRubricScoresAction.bind(null, reportId, teamId);
  const [saveState, saveFormAction, saving] = useActionState(saveAction, rubricScoreInitialState);
  const releaseAction = toggleRubricReleaseAction.bind(null, reportId, teamId, !rubric.released);
  const [releaseState, releaseFormAction, releasing] = useActionState(releaseAction, rubricScoreInitialState);

  // 채점 항목이 없거나, 학생에게 아직 공개되지 않았고 채점자가 아니면 노출하지 않는다.
  if (rubric.criteria.length === 0) return null;
  if (!canEvaluate && !rubric.released) return null;

  const total = rubric.criteria.reduce((sum, criterion) => sum + (criterion.points ?? 0), 0);
  const totalMax = rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);

  return (
    <section aria-labelledby={headingId} className="mt-5 grid gap-4 border-t border-[var(--line)] pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-bold text-[var(--ink)]"><UiText>{"채점표 점수"}</UiText></h3>
        <div className="flex items-center gap-2">
          <StatusBadge tone={rubric.released ? "success" : "neutral"}>{rubric.released ? "공개됨" : "비공개"}</StatusBadge>
          <p className="text-sm font-bold">
            <span className="text-lg tabular-nums text-[var(--primary)]">{total}</span>
            <span className="text-[var(--muted)]"> / {totalMax}</span>
          </p>
        </div>
      </div>

      {canEvaluate ? (
        <form action={saveFormAction} className="grid gap-3">
          <div className="grid gap-2">
            {rubric.criteria.map((criterion) => (
              <label key={criterion.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-3 py-2">
                <span className="text-sm font-semibold text-[var(--ink)]">
                  {criterion.label}
                  <span className="ml-1 text-xs font-normal text-[var(--muted)]">/ {criterion.maxPoints}</span>
                </span>
                <UiInput
                  className="form-control h-9 w-20 bg-white py-1 text-right text-sm"
                  type="number"
                  name={`points_${criterion.id}`}
                  min={0}
                  max={criterion.maxPoints}
                  defaultValue={criterion.points ?? ""}
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="button-secondary" type="submit" disabled={saving}>
              <UiText>{"채점 저장"}</UiText>
            </button>
            <Notice state={saveState} />
          </div>
        </form>
      ) : (
        <ul className="grid gap-2">
          {rubric.criteria.map((criterion) => (
            <li key={criterion.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-3 py-2 text-sm">
              <span className="font-semibold text-[var(--ink)]">{criterion.label}</span>
              <span className="tabular-nums text-[var(--ink)]">{criterion.points ?? 0}<span className="text-[var(--muted)]"> / {criterion.maxPoints}</span></span>
            </li>
          ))}
        </ul>
      )}

      {canRelease ? (
        <form action={releaseFormAction} className="flex flex-wrap items-center gap-3 border-t border-dashed border-[var(--line)] pt-3">
          <button className={rubric.released ? "button-quiet" : "button-primary"} type="submit" disabled={releasing}>
            <UiText>{rubric.released ? "공개 해제" : "학생에게 공개"}</UiText>
          </button>
          {rubric.released && rubric.releasedByName ? (
            <span className="text-xs text-[var(--muted)]"><UiText>{"공개"}</UiText>{" · "}{rubric.releasedByName}</span>
          ) : null}
          <Notice state={releaseState} />
        </form>
      ) : rubric.released ? (
        <p className="text-xs text-[var(--muted)]"><UiText>{"관리자가 공개한 점수입니다."}</UiText></p>
      ) : null}
    </section>
  );
}
