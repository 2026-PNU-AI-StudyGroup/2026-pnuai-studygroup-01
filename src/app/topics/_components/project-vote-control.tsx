"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { toggleProjectVoteAction } from "@/app/programs/_actions/project-vote-actions";
import type { ProgramVoteBallot, ProjectVoteCandidate } from "@/modules/project-voting/application/manage-project-voting";
import { UiText } from "@/modules/translation/ui/i18n-provider";

export type ProjectVoteSelection = {
  ballot?: ProgramVoteBallot;
  selectedTopicIds: ReadonlySet<string>;
  pending: boolean;
  pendingTopicId: string | null;
  toggle: (topicId: string) => void;
};

export function useProjectVoteSelection(ballot?: ProgramVoteBallot): ProjectVoteSelection {
  const ballotKey = ballot ? `${ballot.programId}:${ballot.selectedTopicIds.join(":")}` : "";
  const [previousBallotKey, setPreviousBallotKey] = useState(ballotKey);
  const [selectedTopicIds, setSelectedTopicIds] = useState(() => new Set(ballot?.selectedTopicIds));
  const [pendingTopicId, setPendingTopicId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (ballotKey !== previousBallotKey) {
    setPreviousBallotKey(ballotKey);
    setSelectedTopicIds(new Set(ballot?.selectedTopicIds));
  }

  function toggle(topicId: string) {
    if (!ballot || pending) return;
    const removed = selectedTopicIds.has(topicId);
    setPendingTopicId(topicId);
    startTransition(async () => {
      try {
        const result = await toggleProjectVoteAction({ programId: ballot.programId, topicId });
        const nextSelectedTopicIds = result.selectedTopicIds;
        if (result.status === "success" && nextSelectedTopicIds) {
          setSelectedTopicIds(new Set(nextSelectedTopicIds));
          toast.success(
            result.remainingVotes === 0
              ? <UiText>{"가능한 투표를 모두 사용했습니다."}</UiText>
              : <><UiText>{removed ? "투표를 취소했습니다." : "투표가 반영되었습니다."}</UiText>{" "}<strong>{result.remainingVotes}</strong><UiText>{"장 남았습니다."}</UiText></>,
          );
        } else {
          toast.error(
            result.remainingVotes === 0
              ? <UiText>{"가능한 투표를 모두 사용했습니다."}</UiText>
              : <UiText>{result.message}</UiText>,
          );
        }
      } finally {
        setPendingTopicId(null);
      }
    });
  }

  return { ballot, selectedTopicIds, pending, pendingTopicId, toggle };
}

export function ProjectVoteButton({ candidate, selection }: {
  candidate?: ProjectVoteCandidate;
  selection: ProjectVoteSelection;
}) {
  const ballot = selection.ballot;
  if (!ballot || !candidate || ballot.phase !== "OPEN") return null;

  const selected = selection.selectedTopicIds.has(candidate.id);
  const selfVoteBlocked = !ballot.policy.selfVotingAllowed && candidate.isSelfProject;
  const disabled = selection.pending || selfVoteBlocked;
  const label = selected ? "투표 취소" : selfVoteBlocked ? "투표 불가" : "투표하기";

  return (
    <button
      type="button"
      onClick={() => selection.toggle(candidate.id)}
      disabled={disabled}
      className={`${selected ? "button-secondary" : "button-primary"} w-full`}
    >
      <UiText>{selection.pendingTopicId === candidate.id ? "저장 중" : label}</UiText>
    </button>
  );
}
