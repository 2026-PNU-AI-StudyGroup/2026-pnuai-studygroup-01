import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";

export type ProgramVotingPhase = "UPCOMING" | "OPEN" | "CLOSED";

export function getProgramVotingPhase(policy: ProgramVotingPolicyDetails, now: Date): ProgramVotingPhase {
  if (now < policy.startsAt) return "UPCOMING";
  if (now >= policy.endsAt) return "CLOSED";
  return "OPEN";
}

export function normalizeVoteSelection(topicIds: readonly string[], policy: ProgramVotingPolicyDetails, candidates: ReadonlyArray<{ id: string; divisionId?: string | null }>): string[] {
  const selectedTopicIds = [...new Set(topicIds.map((id) => id.trim()).filter(Boolean))];
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  if (selectedTopicIds.some((id) => !candidateById.has(id))) throw new ProjectVotingPolicyError("투표 후보를 다시 선택해 주세요.");
  const counts = new Map<string, number>();
  for (const id of selectedTopicIds) {
    const key = policy.voteLimitScope === "DIVISION" ? candidateById.get(id)!.divisionId ?? "UNASSIGNED" : "PROGRAM";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if ([...counts.values()].some((count) => count > policy.voteLimit)) {
    throw new ProjectVotingPolicyError("인당 가능 투표수를 초과했습니다.");
  }
  return selectedTopicIds;
}

export class ProjectVotingPolicyError extends Error {}
