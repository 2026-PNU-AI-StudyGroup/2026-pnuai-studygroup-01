import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";
import {
  getProgramVotingPhase,
  type ProgramVoteBallot,
  type ProgramVotingResults,
  type PublicProgramVotingResults,
  type ProjectVotingRepository,
  type ToggleProgramVoteOutcome,
  type VoteIntent,
  type VoteScope,
} from "@/modules/project-voting/application/manage-project-voting";
import type { UserRole } from "@/modules/identity/domain/user-role";
import { canViewPublicVotingResults, isOwnProject, normalizeVoteSelection, ProjectVotingPolicyError, withEffectiveVoteLimit } from "@/modules/project-voting/domain/project-voting-policy";

const VOTABLE_TOPIC_STATUS = "ACTIVE" as const;

// Serializable 트랜잭션이 동시 실행으로 직렬화에 실패(P2034)하면 다시 시도한다.
// 표 하나를 뒤집는 짧은 트랜잭션이라 재시도가 사용자에게 보이지 않는다.
const TOGGLE_ATTEMPTS = 3;

type LockedVotingPolicy = ProgramVotingPolicyDetails & { programId: string };

// 후보 목록에 넣는 조건. 총계도 같은 조건으로 세야 머리말 숫자와 목록 합계가 맞는다.
// 투표 중에 프로젝트를 비공개로 내리면 목록에서는 빠지는데 표는 남아 있다.
const VOTABLE_TOPIC_WHERE = (now: Date) => ({
  publishedAt: { not: null },
  status: VOTABLE_TOPIC_STATUS,
  OR: [
    { program: { endsAt: { gt: now } } },
    { projectTeam: { confirmedAt: { not: null } } },
  ],
});

export class PrismaProjectVotingRepository implements ProjectVotingRepository {
  constructor(private readonly client: PrismaClient) {}

  async findBallot(programId: string, voterId: string, voterRole: UserRole, now: Date): Promise<ProgramVoteBallot | null> {
    const program = await this.client.projectProgram.findUnique({
      where: { id: programId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        votingPolicy: true,
      },
    });
    if (!program?.votingPolicy || !isVisibleTo(program, voterRole)) return null;
    const policy = program.votingPolicy;
    const resultsVisible = voterRole === "ADMIN" || canViewPublicVotingResults(policy, now);
    const [candidates, votes, tallies] = await Promise.all([
      this.client.topic.findMany({
        where: { programId, publishedAt: { not: null }, status: VOTABLE_TOPIC_STATUS, OR: [
          { program: { endsAt: { gt: now } } },
          { projectTeam: { confirmedAt: { not: null } } },
        ] },
        orderBy: [{ title: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          divisionId: true,
          division: { select: { name: true, position: true } },
          authorId: true,
          managerId: true,
          assistants: { where: { userId: voterId }, select: { id: true } },
          projectTeam: { select: { memberships: { where: { userId: voterId, endedAt: null }, select: { id: true } } } },
        },
      }),
      // 후보 목록과 같은 조건으로 고른다. 후보에서 내려간 프로젝트의 표는 카드가 없어
      // 화면에 표시할 자리도, 취소할 자리도 없으므로 선택 상태에서도 뺀다. setVote 의
      // 한도 계산도 같은 기준을 쓴다.
      this.client.projectVote.findMany({
        where: { programId, voterId, topic: VOTABLE_TOPIC_WHERE(now) },
        select: { topicId: true },
      }),
      resultsVisible
        ? this.client.projectVote.groupBy({ by: ["topicId"], where: { programId }, _count: { topicId: true } })
        : Promise.resolve([]),
    ]);
    const voteCounts = new Map(tallies.map((tally) => [tally.topicId, tally._count.topicId]));
    return {
      programId: program.id,
      programName: program.name,
      policy,
      phase: getProgramVotingPhase(policy, now),
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        description: candidate.description,
        divisionId: candidate.divisionId,
        divisionName: candidate.division?.name ?? null,
        divisionPosition: candidate.division?.position ?? null,
        isSelfProject: isOwnProject({
          authorId: candidate.authorId,
          managerId: candidate.managerId,
          assistantCount: candidate.assistants.length,
          memberCount: candidate.projectTeam?.memberships.length ?? 0,
        }, { id: voterId, role: voterRole }),
        voteCount: resultsVisible ? voteCounts.get(candidate.id) ?? 0 : null,
      })).sort((left, right) => ballotSort(left, right, policy.voteLimitScope)),
      selectedTopicIds: votes.map(({ topicId }) => topicId),
    };
  }

  async setVote(input: { programId: string; voterId: string; topicId: string; intent: VoteIntent; votedAt: Date }): Promise<ToggleProgramVoteOutcome> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= TOGGLE_ATTEMPTS; attempt += 1) {
      try {
        return await this.client.$transaction(async (transaction): Promise<ToggleProgramVoteOutcome> => {
          const voters = await transaction.$queryRaw<Array<{ id: string; role: string }>>(Prisma.sql`
            SELECT "id", "role" FROM "user"
            WHERE "id" = ${input.voterId} AND "accountStatus" = 'ACTIVE'
            FOR UPDATE
          `);
          const voter = voters[0];
          if (!voter) return { status: "INACTIVE_VOTER" };
          const voterRole = voter.role as UserRole;

          const visibility = voterRole === "ADMIN"
            ? Prisma.sql`TRUE`
            : Prisma.sql`"project_program"."isPublic" = true`;
          const policies = await transaction.$queryRaw<LockedVotingPolicy[]>(Prisma.sql`
            SELECT
              "program_voting_policy"."programId",
              "program_voting_policy"."startsAt",
              "program_voting_policy"."endsAt",
              "program_voting_policy"."voteLimit",
              "program_voting_policy"."staffVoteLimit",
              "program_voting_policy"."voteLimitScope",
              "program_voting_policy"."selfVotingAllowed",
              "program_voting_policy"."resultsVisibleDuringVoting",
              "program_voting_policy"."resultsVisibleAfterVoting"
            FROM "project_program"
            JOIN "program_voting_policy"
              ON "program_voting_policy"."programId" = "project_program"."id"
            WHERE "project_program"."id" = ${input.programId}
              AND ${visibility}
            FOR UPDATE OF "project_program", "program_voting_policy"
          `);
          const locked = policies[0];
          if (!locked) return { status: "NOT_FOUND" };
          const policy = withEffectiveVoteLimit(locked, voterRole);
          if (getProgramVotingPhase(policy, input.votedAt) !== "OPEN") return { status: "NOT_OPEN" };

          // 지금 던져 둔 표를 같은 트랜잭션 안에서 잠그고 읽는다. 이 읽기가 트랜잭션 밖에 있으면
          // 같은 사람이 탭 두 개에서 서로 다른 프로젝트를 찍을 때 늦게 도착한 요청이 먼저 저장된
          // 표를 지운다. 표가 조용히 사라지므로 아무도 모른다.
          const currentVotes = await transaction.$queryRaw<Array<{ topicId: string }>>(Prisma.sql`
            SELECT "topicId" FROM "project_vote"
            WHERE "programId" = ${input.programId} AND "voterId" = ${input.voterId}
            FOR UPDATE
          `);
          const currentTopicIds = currentVotes.map(({ topicId }) => topicId);
          const alreadyVoted = currentTopicIds.includes(input.topicId);
          const voted = input.intent === "ADD";

          const target = await transaction.topic.findFirst({
            where: { id: input.topicId, programId: input.programId },
            select: {
              id: true,
              divisionId: true,
              authorId: true,
              managerId: true,
              publishedAt: true,
              status: true,
              division: { select: { name: true } },
              program: { select: { endsAt: true } },
              assistants: { where: { userId: input.voterId }, select: { id: true } },
              projectTeam: {
                select: {
                  confirmedAt: true,
                  memberships: { where: { userId: input.voterId, endedAt: null }, select: { id: true } },
                },
              },
            },
          });
          if (!target) return { status: "INVALID_CANDIDATE" };
          const scope: VoteScope = {
            type: policy.voteLimitScope === "DIVISION" ? "DIVISION" : "PROGRAM",
            divisionName: target.division?.name ?? null,
          };

          const others = currentTopicIds.length
            ? await transaction.topic.findMany({ where: { id: { in: currentTopicIds } }, select: { id: true, divisionId: true } })
            : [];
          // 한도는 지금도 후보인 프로젝트에 던진 표로만 센다.
          //
          // 운영진이 프로젝트를 비공개로 내리면 후보 목록에서 빠지지만 표는 남는다(취소는
          // 후보 자격을 안 묻기 때문에 일부러 남긴다). 그런데 한도는 남은 표를 전부 세고
          // 있어서, 화면에 카드가 없는 표가 자리를 계속 차지했다. 취소 버튼이 놓일 카드가
          // 없으니 투표자는 그 한 자리를 투표 기간 내내 되찾을 수 없었고 이유도 알 수 없었다.
          //
          // 결과 집계가 이미 같은 조건으로 숨은 표를 빼므로 기준을 맞춘 것이기도 하다.
          // 프로젝트가 다시 공개되면 그 표는 자연히 다시 세어진다.
          const votableOtherIds = new Set(
            currentTopicIds.length
              ? (await transaction.topic.findMany({
                where: { id: { in: currentTopicIds }, ...VOTABLE_TOPIC_WHERE(input.votedAt) },
                select: { id: true },
              })).map(({ id }) => id)
              : [],
          );
          const countedTopicIds = currentTopicIds.filter((id) => votableOtherIds.has(id));
          const nextTopicIds = alreadyVoted === voted
            ? countedTopicIds
            : voted
              ? [...countedTopicIds, target.id]
              : countedTopicIds.filter((id) => id !== target.id);

          if (alreadyVoted === voted) {
            // 이미 원하는 상태다. 탭 두 개가 같은 버튼을 눌렀거나 새로고침이 겹친 것이다.
            // 아무것도 하지 않고 지금 상태를 그대로 돌려준다.
          } else if (voted) {
            const stillVotable = target.publishedAt !== null
              && target.status === VOTABLE_TOPIC_STATUS
              && (target.program.endsAt > input.votedAt || target.projectTeam?.confirmedAt != null);
            if (!stillVotable) return { status: "INVALID_CANDIDATE" };
            if (!policy.selfVotingAllowed && isOwnProject({
              authorId: target.authorId,
              managerId: target.managerId,
              assistantCount: target.assistants.length,
              memberCount: target.projectTeam?.memberships.length ?? 0,
            }, { id: input.voterId, role: voterRole })) return { status: "SELF_VOTE_FORBIDDEN" };
            try {
              normalizeVoteSelection(nextTopicIds, policy, [...others, { id: target.id, divisionId: target.divisionId }]);
            } catch (error) {
              if (error instanceof ProjectVotingPolicyError && error.violation === "VOTE_LIMIT") {
                return { status: "VOTE_LIMIT_REACHED", voteLimit: policy.voteLimit, scope };
              }
              return { status: "INVALID_CANDIDATE" };
            }
            try {
              await transaction.projectVote.create({
                data: { programId: input.programId, topicId: target.id, voterId: input.voterId, createdAt: input.votedAt },
              });
            } catch (error) {
              // 같은 프로젝트를 탭 두 개로 동시에 누르면 나중 트랜잭션은 시작 시점 스냅샷을 보므로
              // 먼저 들어간 표가 안 보인다. "아직 안 찍었네" 하고 INSERT 하다 유일 제약에 막힌다.
              // 표는 이미 원하는 대로 들어가 있으니 실패로 돌리지 않는다. 둘 다 "투표됨" 으로 끝난다.
              if (!isUniqueViolation(error)) throw error;
            }
          } else {
            // 취소는 후보 자격을 다시 묻지 않는다. 프로젝트가 비공개로 바뀐 뒤에도 자기 표는 뺄 수 있어야 한다.
            await transaction.projectVote.deleteMany({
              where: { programId: input.programId, topicId: target.id, voterId: input.voterId },
            });
          }

          const divisionByTopicId = new Map(
            [...others, { id: target.id, divisionId: target.divisionId }].map(({ id, divisionId }) => [id, divisionId ?? null] as const),
          );
          const bucketOf = (topicId: string) => policy.voteLimitScope === "DIVISION"
            ? divisionByTopicId.get(topicId) ?? "UNASSIGNED"
            : "PROGRAM";
          const usedInScope = nextTopicIds.filter((id) => bucketOf(id) === bucketOf(target.id)).length;

          return {
            status: "SAVED",
            voted,
            selectedTopicIds: nextTopicIds,
            remainingVotes: Math.max(0, policy.voteLimit - usedInScope),
            scope,
          };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (isSerializationFailure(error) && attempt < TOGGLE_ATTEMPTS) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async findResults(programId: string, now: Date): Promise<ProgramVotingResults | null> {
    const program = await this.client.projectProgram.findUnique({
      where: { id: programId },
      select: { id: true, name: true, votingPolicy: true },
    });
    if (!program?.votingPolicy) return null;
    const policy = program.votingPolicy;
    const [topics, totalVotes, voters, votesWithVoters] = await Promise.all([
      this.client.topic.findMany({
        where: { programId, publishedAt: { not: null }, status: VOTABLE_TOPIC_STATUS, OR: [
          { program: { endsAt: { gt: now } } },
          { projectTeam: { confirmedAt: { not: null } } },
        ] },
        orderBy: [{ title: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          projectTeam: { select: { name: true } },
          divisionId: true,
          division: { select: { name: true, position: true } },
          _count: { select: { votes: { where: { programId } } } },
        },
      }),
      this.client.projectVote.count({ where: { programId, topic: VOTABLE_TOPIC_WHERE(now) } }),
      this.client.projectVote.groupBy({ by: ["voterId"], where: { programId } }),
      this.client.projectVote.findMany({
        where: { programId },
        select: { topicId: true, voter: { select: { id: true, name: true, email: true, role: true } } },
      }),
    ]);
    const votersByTopic = new Map<string, Array<{
      id: string;
      name: string;
      email: string;
      role: "STUDENT" | "PROFESSOR" | "ADMIN" | "ADVISOR";
    }>>();
    for (const vote of votesWithVoters) {
      votersByTopic.set(vote.topicId, [...(votersByTopic.get(vote.topicId) ?? []), vote.voter]);
    }
    const sorted = topics
      .map((topic) => ({
        topicId: topic.id,
        title: topic.title,
        description: topic.description,
        teamName: topic.projectTeam?.name ?? null,
        divisionId: topic.divisionId,
        divisionName: topic.division?.name ?? null,
        divisionPosition: topic.division?.position ?? null,
        voteCount: topic._count.votes,
        voters: [...(votersByTopic.get(topic.id) ?? [])].sort((left, right) =>
          left.name.localeCompare(right.name, "ko") || left.email.localeCompare(right.email),
        ),
      }))
      .sort((left, right) => resultSort(left, right, policy.voteLimitScope));
    const results = addRanks(sorted, policy.voteLimitScope);
    return {
      programId: program.id,
      programName: program.name,
      policy,
      phase: getProgramVotingPhase(policy, now),
      totalVotes,
      participantCount: voters.length,
      results,
    };
  }

  async findPublicResults(programId: string, viewerRole: "STUDENT" | "PROFESSOR" | "ADVISOR", now: Date): Promise<PublicProgramVotingResults | null> {
    const program = await this.client.projectProgram.findUnique({
      where: { id: programId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        votingPolicy: true,
      },
    });
    if (!program?.votingPolicy || !isVisibleTo(program, viewerRole) || !canViewPublicVotingResults(program.votingPolicy, now)) return null;

    const policy = program.votingPolicy;
    const phase = getProgramVotingPhase(policy, now);
    if (phase === "UPCOMING") return null;
    const [topics, totalVotes] = await Promise.all([
      this.client.topic.findMany({
        where: { programId, publishedAt: { not: null }, status: VOTABLE_TOPIC_STATUS, OR: [
          { program: { endsAt: { gt: now } } },
          { projectTeam: { confirmedAt: { not: null } } },
        ] },
        orderBy: [{ title: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          projectTeam: { select: { name: true } },
          divisionId: true,
          division: { select: { name: true, position: true } },
          _count: { select: { votes: { where: { programId } } } },
        },
      }),
      this.client.projectVote.count({ where: { programId, topic: VOTABLE_TOPIC_WHERE(now) } }),
    ]);
    const sorted = topics
      .map((topic) => ({
        topicId: topic.id,
        title: topic.title,
        teamName: topic.projectTeam?.name ?? null,
        divisionId: topic.divisionId,
        divisionName: topic.division?.name ?? null,
        divisionPosition: topic.division?.position ?? null,
        voteCount: topic._count.votes,
      }))
      .sort((left, right) => resultSort(left, right, policy.voteLimitScope));

    return {
      programId: program.id,
      programName: program.name,
      phase,
      voteLimitScope: policy.voteLimitScope,
      totalVotes,
      results: addRanks(sorted, policy.voteLimitScope),
    };
  }
}

function addRanks<T extends { divisionId: string | null; voteCount: number }>(
  sorted: T[],
  scope: ProgramVotingPolicyDetails["voteLimitScope"],
): Array<T & { rank: number }> {
  const divisionRanking = new Map<string, { count: number; priorVoteCount?: number; rank: number }>();
  return sorted.map((result) => {
    const key = scope === "DIVISION" ? result.divisionId ?? "UNASSIGNED" : "PROGRAM";
    const state = divisionRanking.get(key) ?? { count: 0, rank: 0 };
    state.count += 1;
    if (state.priorVoteCount !== result.voteCount) state.rank = state.count;
    state.priorVoteCount = result.voteCount;
    divisionRanking.set(key, state);
    return { ...result, rank: state.rank };
  });
}

function isVisibleTo(program: { isPublic: boolean }, role: UserRole) {
  return role === "ADMIN" || program.isPublic;
}

function ballotSort(
  left: { title: string; divisionPosition?: number | null },
  right: { title: string; divisionPosition?: number | null },
  scope: ProgramVotingPolicyDetails["voteLimitScope"],
) {
  if (scope === "DIVISION") {
    const divisionComparison = divisionSortPosition(left.divisionPosition) - divisionSortPosition(right.divisionPosition);
    if (divisionComparison) return divisionComparison;
  }
  return left.title.localeCompare(right.title, "ko");
}

function resultSort(
  left: { title: string; divisionPosition?: number | null; voteCount: number },
  right: { title: string; divisionPosition?: number | null; voteCount: number },
  scope: ProgramVotingPolicyDetails["voteLimitScope"],
) {
  if (scope === "DIVISION") {
    const divisionComparison = divisionSortPosition(left.divisionPosition) - divisionSortPosition(right.divisionPosition);
    if (divisionComparison) return divisionComparison;
  }
  return right.voteCount - left.voteCount || left.title.localeCompare(right.title, "ko");
}

function divisionSortPosition(position: number | null | undefined) {
  return position ?? Number.MAX_SAFE_INTEGER;
}

function isSerializationFailure(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
