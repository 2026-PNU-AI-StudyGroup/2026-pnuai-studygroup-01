import type { CurrentActor, CurrentUser } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";
import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";
import {
  getProgramVotingPhase,
  ProjectVotingPolicyError,
  withEffectiveVoteLimit,
  type ProgramVotingPhase,
} from "@/modules/project-voting/domain/project-voting-policy";

export type ProjectVoteCandidate = {
  id: string;
  title: string;
  description: string;
  divisionId?: string | null;
  divisionName?: string | null;
  divisionPosition?: number | null;
  isSelfProject: boolean;
  voteCount: number | null;
};

export type ProgramVoteBallot = {
  programId: string;
  programName: string;
  policy: ProgramVotingPolicyDetails;
  phase: ProgramVotingPhase;
  candidates: ProjectVoteCandidate[];
  selectedTopicIds: string[];
};

export type ProgramVoteResult = {
  topicId: string;
  title: string;
  description: string;
  teamName: string | null;
  divisionId: string | null;
  divisionName: string | null;
  divisionPosition?: number | null;
  voteCount: number;
  rank: number;
  voters: Array<{
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "PROFESSOR" | "ADMIN" | "ADVISOR";
  }>;
};

export type ProgramVotingResults = {
  programId: string;
  programName: string;
  policy: ProgramVotingPolicyDetails;
  phase: ProgramVotingPhase;
  totalVotes: number;
  participantCount: number;
  results: ProgramVoteResult[];
};

export type PublicProgramVoteResult = Omit<ProgramVoteResult, "description" | "voters">;

export type PublicProgramVotingResults = {
  programId: string;
  programName: string;
  phase: Exclude<ProgramVotingPhase, "UPCOMING">;
  voteLimitScope: "PROGRAM" | "DIVISION";
  totalVotes: number;
  results: PublicProgramVoteResult[];
};

export type VotingResultsView =
  | { mode: "ADMIN"; results: ProgramVotingResults }
  | { mode: "PUBLIC"; results: PublicProgramVotingResults };

/** 화면이 보고 있던 상태에서 사용자가 무엇을 하려 했는지. */
export type VoteIntent = "ADD" | "REMOVE";

export type ToggleProgramVoteFailure =
  | "NOT_FOUND"
  | "INACTIVE_VOTER"
  | "NOT_OPEN"
  | "INVALID_CANDIDATE"
  | "SELF_VOTE_FORBIDDEN"
  | "NOT_INVITED";

/** 한도를 세는 묶음. 프로그램 전체이거나 분과 하나. */
export type VoteScope = { type: "PROGRAM" | "DIVISION"; divisionName: string | null };

export type ToggleProgramVoteOutcome =
  | { status: "SAVED"; voted: boolean; selectedTopicIds: string[]; remainingVotes: number; scope: VoteScope }
  | { status: "VOTE_LIMIT_REACHED"; voteLimit: number; scope: VoteScope }
  | { status: ToggleProgramVoteFailure };

export type SavedProgramVote = Extract<ToggleProgramVoteOutcome, { status: "SAVED" }>;

export function voteScopeLabel(scope: VoteScope): string {
  return scope.type === "DIVISION" ? `${scope.divisionName ?? "미분과"} 분과` : "프로그램 전체";
}

export interface ProjectVotingRepository {
  findBallot(programId: string, voterId: string, voterRole: UserRole, now: Date): Promise<ProgramVoteBallot | null>;
  /**
   * 표 하나를 원하는 상태로 맞춘다. 지금 어떤 표를 던져 뒀는지는 저장소가 트랜잭션 안에서 읽는다.
   *
   * 화면이 계산한 "다음 집합"을 받아 통째로 덮어쓰면 안 된다. 그 집합은 트랜잭션 밖에서 읽은
   * 값으로 만들어지므로, 같은 사람이 탭 두 개에서 서로 다른 프로젝트를 찍으면 늦게 도착한
   * 요청이 먼저 저장된 표를 지운다.
   *
   * "뒤집어라" 가 아니라 "넣어라 / 빼라" 를 받는 것도 같은 이유다. 탭 두 개가 모두 투표하기를
   * 보여주고 있으면 사용자 의도는 둘 다 넣기인데, 뒤집기로 받으면 나중 요청이 먼저 들어간
   * 표를 지운다. 이미 원하는 상태면 아무것도 하지 않고 성공으로 돌려준다.
   */
  setVote(input: { programId: string; voterId: string; topicId: string; intent: VoteIntent; votedAt: Date }): Promise<ToggleProgramVoteOutcome>;
  findResults(programId: string, now: Date): Promise<ProgramVotingResults | null>;
  findPublicResults(programId: string, viewer: { id: string; role: "STUDENT" | "PROFESSOR" | "ADVISOR" }, now: Date): Promise<PublicProgramVotingResults | null>;
}

export class ProjectVotingOperationError extends Error {}

export class ProjectVotingService {
  constructor(
    private readonly repository: ProjectVotingRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getBallot(actor: CurrentUser, programId: string) {
    const ballot = await this.repository.findBallot(programId, actor.id, actor.role, this.now());
    return ballot ? { ...ballot, policy: withEffectiveVoteLimit(ballot.policy, actor.role) } : null;
  }

  async setVote(actor: CurrentUser, programId: string, topicId: string, intent: VoteIntent): Promise<SavedProgramVote> {
    const outcome = await this.repository.setVote({ programId, voterId: actor.id, topicId, intent, votedAt: this.now() });
    if (outcome.status === "SAVED") return outcome;
    if (outcome.status === "VOTE_LIMIT_REACHED") {
      throw new ProjectVotingOperationError(`${voteScopeLabel(outcome.scope)}에서 가능한 ${outcome.voteLimit}표를 모두 사용했습니다.`);
    }
    const message: Record<ToggleProgramVoteFailure, string> = {
      NOT_FOUND: "투표 설정이 없는 프로그램입니다.",
      INACTIVE_VOTER: "활성 상태인 사용자만 투표할 수 있습니다.",
      NOT_OPEN: "현재 투표 가능한 기간이 아닙니다.",
      INVALID_CANDIDATE: "공개 이력이 있는 같은 프로그램 프로젝트만 선택할 수 있습니다.",
      SELF_VOTE_FORBIDDEN: "자기 프로젝트에는 투표할 수 없습니다.",
      NOT_INVITED: "초대받은 프로그램에서만 투표할 수 있습니다.",
    };
    throw new ProjectVotingOperationError(message[outcome.status]);
  }

  async getResults(actor: CurrentActor, programId: string) {
    if (actor.role !== "ADMIN") throw new ProjectVotingOperationError("관리자만 득표현황을 볼 수 있습니다.");
    return this.repository.findResults(programId, this.now());
  }

  async getPublicResults(actor: CurrentUser, programId: string) {
    if (actor.role === "ADMIN") throw new ProjectVotingOperationError("관리자는 상세 득표현황을 조회해 주세요.");
    return this.repository.findPublicResults(programId, { id: actor.id, role: actor.role }, this.now());
  }
}

export { ProjectVotingPolicyError, getProgramVotingPhase };
