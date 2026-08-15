"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { toggleProjectVoteAction } from "@/app/_actions/project-vote-actions";
import type { ProgramVoteBallot, ProjectVoteCandidate } from "@/modules/project-voting/application/manage-project-voting";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { BallotBoxIcon } from "@/shared/ui/workspace-icons";

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
    setPendingTopicId(topicId);
    startTransition(async () => {
      try {
        const result = await toggleProjectVoteAction({ programId: ballot.programId, topicId });
        const nextSelectedTopicIds = result.selectedTopicIds;
        if (result.status === "success" && nextSelectedTopicIds) {
          setSelectedTopicIds(new Set(nextSelectedTopicIds));
          toast.success(<UiText>{result.message}</UiText>);
        } else {
          toast.error(<UiText>{result.message}</UiText>);
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
  if (!ballot || !candidate) return null;
  if (ballot.phase !== "OPEN") return <button type="button" disabled className="button-secondary w-full"><UiText>{ballot.phase === "UPCOMING" ? "투표 시작 전" : "투표 기간 종료"}</UiText></button>;

  const selected = selection.selectedTopicIds.has(candidate.id);
  const selfVoteBlocked = !ballot.policy.selfVotingAllowed && candidate.isSelfProject;
  const bucketSelected = ballot.policy.voteLimitScope === "PROGRAM" ? selection.selectedTopicIds.size : [...selection.selectedTopicIds].filter((id) => (ballot.candidates.find((item) => item.id === id)?.divisionId ?? "UNASSIGNED") === (candidate.divisionId ?? "UNASSIGNED")).length;
  const limitReached = !selected && bucketSelected >= ballot.policy.voteLimit;
  const disabled = selection.pending || selfVoteBlocked || limitReached;
  const scopeName = ballot.policy.voteLimitScope === "DIVISION" ? candidate.divisionName ?? "미분과" : "프로그램 전체";
  const label = selection.pending
    ? selection.pendingTopicId === candidate.id ? "저장 중" : "다른 투표 저장 중"
    : selected ? "투표 취소"
      : selfVoteBlocked ? "자기 프로젝트 투표 불가"
        : limitReached ? `${scopeName} 한도 도달`
          : "투표하기";

  return (
    <button
      type="button"
      onClick={() => selection.toggle(candidate.id)}
      disabled={disabled}
      className={`${selected ? "button-secondary" : "button-primary"} w-full`}
    >
      <UiText>{label}</UiText>
    </button>
  );
}

export function ArchivedProjectVoteAction({
  ballot,
  topicId,
}: {
  ballot?: ProgramVoteBallot;
  topicId: string;
}) {
  const selection = useProjectVoteSelection(ballot);
  const candidate = ballot?.phase === "OPEN"
    ? ballot.candidates.find(({ id }) => id === topicId)
    : undefined;
  if (!candidate) return null;

  return (
    <section aria-label="프로젝트 투표">
      <ProjectVoteStatusPill selection={selection} />
      <div className="mt-3">
        <ProjectVoteButton candidate={candidate} selection={selection} />
      </div>
    </section>
  );
}

export function ProjectVoteCountBadge({ voteCount }: { voteCount: number }) {
  return (
    <span
      aria-label={`득표 ${voteCount}표`}
      className="pointer-events-none absolute bottom-3 right-3 z-[2] inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/20 bg-[rgba(31,35,48,.88)] px-2.5 text-xs font-semibold text-white shadow-sm"
    >
      <BallotBoxIcon className="size-4" />
      <strong aria-hidden="true" className="tabular-nums">{voteCount}<UiText>{"표"}</UiText></strong>
    </span>
  );
}

export function ProjectVoteStatusPill({ selection }: { selection: ProjectVoteSelection }) {
  const ballot = selection.ballot;
  if (!ballot) return null;
  const label = ballot.phase === "UPCOMING"
    ? "투표 시작 전"
    : ballot.phase === "CLOSED"
      ? "투표 종료"
      : ballot.policy.voteLimitScope === "DIVISION"
        ? `투표 가능: 분과별 최대 ${ballot.policy.voteLimit}표`
        : `투표 가능 ${selection.selectedTopicIds.size}/${ballot.policy.voteLimit}`;
  const indicatorTone = ballot.phase === "OPEN" ? "bg-[var(--primary)]" : "bg-[var(--muted)]";

  return (
    <span
      role="status"
      aria-label="투표 현황"
      className="inline-flex min-h-9 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--line)] bg-white px-3 text-xs font-bold text-[var(--ink)]"
    >
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${indicatorTone}`} />
      <UiText>{label}</UiText>
    </span>
  );
}
