"use client";

import { useActionState } from "react";

import { rubricScoreInitialState, saveRubricScoresAction } from "@/app/teams/[teamId]/_actions/rubric-actions";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export function EvaluationScoreForm({
  evaluationId,
  teamId,
  criteria,
}: {
  evaluationId: string;
  teamId: string;
  criteria: Array<{ id: string; label: string; maxPoints: number; points: number | null }>;
}) {
  const [state, action, pending] = useActionState(saveRubricScoresAction.bind(null, evaluationId, teamId), rubricScoreInitialState);
  return (
    <form action={action} className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5">
      {criteria.map((criterion) => (
        <label key={criterion.id} className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 text-sm">
          <span className="font-semibold">{criterion.label}<span className="ml-1 text-xs font-normal text-[var(--muted)]"><UiText>{`/ ${criterion.maxPoints}점`}</UiText></span></span>
          <UiInput name={`points_${criterion.id}`} type="number" min={0} max={criterion.maxPoints} defaultValue={criterion.points ?? ""} required className="form-control" aria-label={`${criterion.label} 점수`} />
        </label>
      ))}
      {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`text-sm font-semibold ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
      <div><button className="button-primary" disabled={pending || criteria.length === 0}><UiText>{pending ? "저장 중" : "점수 저장"}</UiText></button></div>
    </form>
  );
}
