"use client";

import { useActionState } from "react";

import { saveRubricScoresAction, type RubricScoreState } from "@/app/projects/[projectId]/_actions/rubric-actions";
import { UiInput } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

const rubricScoreInitialState: RubricScoreState = { status: "idle", message: "" };

// 항목마다 한 줄. 이름은 왼쪽, 점수 칸과 만점은 오른쪽 끝에 맞춘다. 저장은 표 아래 버튼 하나로 한 번에.
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
    <form action={action} className="text-[0.8125rem]">
      {criteria.map((criterion) => (
        <label key={criterion.id} className="flex min-h-12 items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-1.5">
          <span className="min-w-0 text-[var(--ink)]">{criterion.label}</span>
          <span className="flex shrink-0 items-center gap-1.5 tabular-nums text-[var(--muted)]">
            <UiInput name={`points_${criterion.id}`} type="number" min={0} max={criterion.maxPoints} defaultValue={criterion.points ?? ""} required className="form-control h-9 min-h-9 w-20 px-2.5 py-1 text-right text-sm tabular-nums" aria-label={`${criterion.label} 점수`} />
            <UiText>{`/ ${criterion.maxPoints}점`}</UiText>
          </span>
        </label>
      ))}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--line)] px-5 py-3">
        {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`mr-auto font-medium ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}`}><UiText>{state.message}</UiText></p> : null}
        <button className="button-primary button-compact min-h-8 px-3" disabled={pending || criteria.length === 0}><UiText>{pending ? "저장 중" : "점수 저장"}</UiText></button>
      </div>
    </form>
  );
}
