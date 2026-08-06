"use client";

import { useActionState, useState } from "react";

import { initialProjectVoteActionState, saveProjectVotesAction } from "@/app/programs/_actions/project-vote-actions";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { ChoiceCard } from "@/shared/ui/form-system";

export function ProjectVoteBallot({ ballot }: { ballot: ProgramVoteBallot }) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(ballot.selectedTopicIds));
  const [state, action, pending] = useActionState(saveProjectVotesAction, initialProjectVoteActionState);
  const votingOpen = ballot.phase === "OPEN";
  const remaining = ballot.policy.voteLimit - selectedIds.size;

  function toggle(topicId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(topicId)) next.delete(topicId);
      else if (next.size < ballot.policy.voteLimit) next.add(topicId);
      return next;
    });
  }

  return (
    <form action={action} aria-busy={pending} className="space-y-5">
      <input type="hidden" name="programId" value={ballot.programId} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3">
        <p className="text-sm font-semibold"><UiText>{"선택한 프로젝트"}</UiText> <strong className="text-[var(--primary)]">{selectedIds.size} / {ballot.policy.voteLimit}</strong></p>
        <p className="text-xs text-[var(--muted)]"><UiText>{ballot.policy.identityVisibility === "ANONYMOUS" ? "익명 투표이며 관리자 결과에 개인별 선택을 표시하지 않습니다." : "기명 투표이며 관리자는 개인별 선택을 확인할 수 있습니다."}</UiText></p>
      </div>
      {ballot.candidates.length ? (
        <ul className="grid gap-3">
          {ballot.candidates.map((candidate) => {
            const selected = selectedIds.has(candidate.id);
            const selfVoteBlocked = !ballot.policy.selfVotingAllowed && candidate.isSelfProject;
            const atLimit = !selected && remaining <= 0;
            const disabled = pending || !votingOpen || selfVoteBlocked || atLimit;
            return (
              <li key={candidate.id}>
                <ChoiceCard
                  type="checkbox"
                  name="topicId"
                  value={candidate.id}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => toggle(candidate.id)}
                  label={candidate.title}
                  description={candidate.description}
                  className={`${selected ? "border-[var(--primary)] bg-[var(--primary-subtle)]" : "border-[var(--line)] bg-white"} ${disabled && !selected ? "opacity-60" : "cursor-pointer hover:border-[var(--line-strong)]"}`}
                />
                {selfVoteBlocked ? <p className="mt-2 text-xs font-semibold text-[var(--danger)]"><UiText>{"자기 프로젝트에는 투표할 수 없습니다."}</UiText></p> : null}
              </li>
            );
          })}
        </ul>
      ) : <p role="status" className="rounded-xl border border-dashed border-[var(--line-strong)] bg-white p-6 text-center text-sm text-[var(--muted)]"><UiText>{"아직 투표할 수 있는 공개 프로젝트가 없습니다."}</UiText></p>}
      {state.message ? <p role={state.status === "error" ? "alert" : "status"} aria-live="polite" className={state.status === "error" ? "text-sm font-semibold text-[var(--danger)]" : "text-sm font-semibold text-[var(--success)]"}><UiText>{state.message}</UiText></p> : null}
      {votingOpen ? <div className="flex flex-wrap justify-end gap-2"><button type="submit" className="button-primary" disabled={pending}><UiText>{pending ? "저장 중" : "투표 저장"}</UiText></button></div> : null}
    </form>
  );
}
