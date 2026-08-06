import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";

export type ProgramVotingPhase = "UPCOMING" | "OPEN" | "CLOSED";

export function getProgramVotingPhase(policy: ProgramVotingPolicyDetails, now: Date): ProgramVotingPhase {
  if (now < policy.startsAt) return "UPCOMING";
  if (now >= policy.endsAt) return "CLOSED";
  return "OPEN";
}

export function normalizeVoteSelection(topicIds: readonly string[], voteLimit: number): string[] {
  const selectedTopicIds = [...new Set(topicIds.map((id) => id.trim()).filter(Boolean))];
  if (selectedTopicIds.length > voteLimit) {
    throw new ProjectVotingPolicyError("인당 가능 투표수를 초과했습니다.");
  }
  return selectedTopicIds;
}

export class ProjectVotingPolicyError extends Error {}
