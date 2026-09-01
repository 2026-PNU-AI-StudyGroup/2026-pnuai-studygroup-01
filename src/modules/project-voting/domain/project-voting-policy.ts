import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";

export type ProgramVotingPhase = "UPCOMING" | "OPEN" | "CLOSED";

export function getProgramVotingPhase(policy: ProgramVotingPolicyDetails, now: Date): ProgramVotingPhase {
  if (now < policy.startsAt) return "UPCOMING";
  if (now >= policy.endsAt) return "CLOSED";
  return "OPEN";
}

export function canViewPublicVotingResults(policy: ProgramVotingPolicyDetails, now: Date): boolean {
  const phase = getProgramVotingPhase(policy, now);
  if (phase === "UPCOMING") return false;
  return phase === "OPEN" ? policy.resultsVisibleDuringVoting : policy.resultsVisibleAfterVoting;
}

/** 인기상을 받는 팀 수. 심사로 정해지는 상과 달리 표만으로 갈린다. */
export const POPULAR_AWARD_TEAM_COUNT = 2;

/**
 * 인기상을 드러내도 되는 때인지.
 *
 * 투표가 끝나고 결과를 공개하기로 한 프로그램에서만 보인다. 진행 중에 순위를 보여 주면
 * 뒤처진 팀이 표를 몰아 달라고 움직이게 되고, 그 순간 인기 투표가 아니라 동원 경쟁이 된다.
 * 진행 중 득표 공개(resultsVisibleDuringVoting)를 켜 두었더라도 상 이름은 끝난 뒤에 붙인다.
 */
export function canShowPopularAward(policy: ProgramVotingPolicyDetails, now: Date): boolean {
  return getProgramVotingPhase(policy, now) === "CLOSED" && policy.resultsVisibleAfterVoting;
}

/**
 * 득표 상위 팀을 고른다.
 *
 * 경계에서 표가 같으면 모두 넣는다. 같은 표를 받았는데 정원에 걸린다는 이유로 하나만
 * 자르면 상을 임의로 뺏는 셈이다. 한 표도 못 받은 팀은 넣지 않는다.
 */
export function pickPopularAwardTopicIds(
  entries: ReadonlyArray<{ topicId: string; votes: number }>,
  limit: number = POPULAR_AWARD_TEAM_COUNT,
): Set<string> {
  const ranked = entries.filter(({ votes }) => votes > 0).sort((left, right) => right.votes - left.votes);
  if (ranked.length === 0 || limit <= 0) return new Set();
  const cutoff = ranked[Math.min(limit, ranked.length) - 1]!.votes;
  return new Set(ranked.filter(({ votes }) => votes >= cutoff).map(({ topicId }) => topicId));
}

// 이 사람이 이 프로젝트의 당사자인지. 당사자면 selfVotingAllowed 가 꺼진 프로그램에서 투표할 수 없다.
//
// managerId 를 무조건 당사자로 보면 안 된다. 학생이 등록한 프로젝트를 관리자 경로로 승인하면
// 관리자는 심사하는 자리라 자기 프로젝트 제한을 두지 않는다. 승인한 관리자가 그 프로젝트의
// managerId 로 박히기 때문에, 당사자로 보기 시작하면 자기가 승인한 프로젝트 전부에 막힌다.
// 본인이 속한 팀이라도 마찬가지로 열어 둔다.
export function isOwnProject(
  candidate: { authorId: string; managerId: string | null; assistantCount: number; memberCount: number },
  voter: { id: string; role: string },
): boolean {
  if (voter.role === "ADMIN") return false;
  if (candidate.authorId === voter.id) return true;
  if (candidate.assistantCount > 0 || candidate.memberCount > 0) return true;
  return candidate.managerId === voter.id;
}

// 자문위원·관리자는 심사 목적이라 학생과 다른 한도(staffVoteLimit)를 적용한다.
export function withEffectiveVoteLimit<T extends ProgramVotingPolicyDetails>(policy: T, role: string): T {
  return role === "ADMIN" || role === "ADVISOR" ? { ...policy, voteLimit: policy.staffVoteLimit ?? 5 } : policy;
}

export function normalizeVoteSelection(topicIds: readonly string[], policy: ProgramVotingPolicyDetails, candidates: ReadonlyArray<{ id: string; divisionId?: string | null }>): string[] {
  const selectedTopicIds = [...new Set(topicIds.map((id) => id.trim()).filter(Boolean))];
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  if (selectedTopicIds.some((id) => !candidateById.has(id))) throw new ProjectVotingPolicyError("투표 후보를 다시 선택해 주세요.", "INVALID_CANDIDATE");
  const counts = new Map<string, number>();
  for (const id of selectedTopicIds) {
    const key = policy.voteLimitScope === "DIVISION" ? candidateById.get(id)!.divisionId ?? "UNASSIGNED" : "PROGRAM";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if ([...counts.values()].some((count) => count > policy.voteLimit)) {
    throw new ProjectVotingPolicyError("인당 가능 투표수를 초과했습니다.", "VOTE_LIMIT");
  }
  return selectedTopicIds;
}

// 한도 초과와 후보 오류는 화면에서 다르게 말해 줘야 한다. 메시지 문자열로 구분하면 문구를
// 고칠 때마다 조용히 깨지므로 종류를 값으로 들고 다닌다.
export type ProjectVotingPolicyViolation = "INVALID_CANDIDATE" | "VOTE_LIMIT";

export class ProjectVotingPolicyError extends Error {
  constructor(message: string, readonly violation: ProjectVotingPolicyViolation = "INVALID_CANDIDATE") {
    super(message);
  }
}
