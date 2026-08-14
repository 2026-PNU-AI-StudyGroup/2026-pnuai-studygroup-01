import type { CurrentActor, CurrentUser } from "@/modules/identity/domain/current-actor";
import type { UserRole } from "@/modules/identity/domain/user-role";
import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";
import {
  getProgramVotingPhase,
  normalizeVoteSelection,
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

export type ReplaceProgramVotesOutcome =
  | "SAVED"
  | "NOT_FOUND"
  | "INACTIVE_VOTER"
  | "NOT_OPEN"
  | "INVALID_CANDIDATE"
  | "SELF_VOTE_FORBIDDEN";

export interface ProjectVotingRepository {
  findBallot(programId: string, voterId: string, voterRole: UserRole, now: Date): Promise<ProgramVoteBallot | null>;
  replaceVotes(input: { programId: string; voterId: string; voterRole?: UserRole; topicIds: string[]; votedAt: Date }): Promise<ReplaceProgramVotesOutcome>;
  findResults(programId: string, now: Date): Promise<ProgramVotingResults | null>;
  findPublicResults(programId: string, viewerRole: "STUDENT" | "PROFESSOR" | "ADVISOR", now: Date): Promise<PublicProgramVotingResults | null>;
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

  async saveVotes(actor: CurrentUser, programId: string, topicIds: readonly string[]) {
    const ballot = await this.getBallot(actor, programId);
    if (!ballot) throw new ProjectVotingOperationError("투표 설정이 없는 프로그램입니다.");
    const selectedTopicIds = normalizeVoteSelection(topicIds, ballot.policy, ballot.candidates);
    const outcome = await this.repository.replaceVotes({
      programId,
      voterId: actor.id,
      voterRole: actor.role,
      topicIds: selectedTopicIds,
      votedAt: this.now(),
    });
    if (outcome === "SAVED") return;
    const message: Record<Exclude<ReplaceProgramVotesOutcome, "SAVED">, string> = {
      NOT_FOUND: "투표 설정이 없는 프로그램입니다.",
      INACTIVE_VOTER: "활성 상태인 사용자만 투표할 수 있습니다.",
      NOT_OPEN: "현재 투표 가능한 기간이 아닙니다.",
      INVALID_CANDIDATE: "공개 이력이 있는 같은 프로그램 프로젝트만 선택할 수 있습니다.",
      SELF_VOTE_FORBIDDEN: "자기 프로젝트에는 투표할 수 없습니다.",
    };
    throw new ProjectVotingOperationError(message[outcome]);
  }

  async getResults(actor: CurrentActor, programId: string) {
    if (actor.role !== "ADMIN") throw new ProjectVotingOperationError("관리자만 득표현황을 볼 수 있습니다.");
    return this.repository.findResults(programId, this.now());
  }

  async getPublicResults(actor: CurrentUser, programId: string) {
    if (actor.role === "ADMIN") throw new ProjectVotingOperationError("관리자는 상세 득표현황을 조회해 주세요.");
    return this.repository.findPublicResults(programId, actor.role, this.now());
  }
}

export { ProjectVotingPolicyError, getProgramVotingPhase };
