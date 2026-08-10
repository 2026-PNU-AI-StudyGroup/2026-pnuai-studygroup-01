import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";
import {
  getProgramVotingPhase,
  type ProgramVoteBallot,
  type ProgramVotingResults,
  type ProjectVotingRepository,
  type ReplaceProgramVotesOutcome,
} from "@/modules/project-voting/application/manage-project-voting";
import { normalizeVoteSelection } from "@/modules/project-voting/domain/project-voting-policy";

const VOTABLE_TOPIC_STATUSES: Array<"PUBLISHED" | "CLOSED"> = ["PUBLISHED", "CLOSED"];

type LockedVotingPolicy = ProgramVotingPolicyDetails & { programId: string };

export class PrismaProjectVotingRepository implements ProjectVotingRepository {
  constructor(private readonly client: PrismaClient) {}

  async findBallot(programId: string, voterId: string, now: Date): Promise<ProgramVoteBallot | null> {
    const program = await this.client.projectProgram.findUnique({
      where: { id: programId },
      select: {
        id: true,
        name: true,
        isPublic: true,
        lifecycleStatus: true,
        votingPolicy: true,
      },
    });
    if (!program?.votingPolicy || !program.isPublic || program.lifecycleStatus !== "ACTIVE") return null;
    const policy = program.votingPolicy;
    const [candidates, votes] = await Promise.all([
      this.client.topic.findMany({
        where: { programId, publishedAt: { not: null }, status: { in: VOTABLE_TOPIC_STATUSES } },
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
          team: { select: { members: { where: { studentId: voterId }, select: { id: true } } } },
        },
      }),
      this.client.projectVote.findMany({ where: { programId, voterId }, select: { topicId: true } }),
    ]);
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
        isSelfProject: candidate.authorId === voterId ||
          candidate.managerId === voterId ||
          candidate.assistants.length > 0 ||
          (candidate.team?.members.length ?? 0) > 0,
      })).sort((left, right) => policySort(left, right, policy.voteLimitScope)),
      selectedTopicIds: votes.map(({ topicId }) => topicId),
    };
  }

  async replaceVotes(input: { programId: string; voterId: string; topicIds: string[]; votedAt: Date }): Promise<ReplaceProgramVotesOutcome> {
    return this.client.$transaction(async (transaction) => {
      const voters = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "user"
        WHERE "id" = ${input.voterId} AND "isActive" = true
        FOR UPDATE
      `);
      if (!voters[0]) return "INACTIVE_VOTER";

      const policies = await transaction.$queryRaw<LockedVotingPolicy[]>(Prisma.sql`
        SELECT
          "program_voting_policy"."programId",
          "program_voting_policy"."startsAt",
          "program_voting_policy"."endsAt",
          "program_voting_policy"."voteLimit",
          "program_voting_policy"."voteLimitScope",
          "program_voting_policy"."selfVotingAllowed",
          "program_voting_policy"."identityVisibility"
        FROM "project_program"
        JOIN "program_voting_policy"
          ON "program_voting_policy"."programId" = "project_program"."id"
        WHERE "project_program"."id" = ${input.programId}
          AND "project_program"."isPublic" = true
          AND "project_program"."lifecycleStatus" = 'ACTIVE'
        FOR UPDATE OF "project_program", "program_voting_policy"
      `);
      const policy = policies[0];
      if (!policy) return "NOT_FOUND";
      if (getProgramVotingPhase(policy, input.votedAt) !== "OPEN") return "NOT_OPEN";

      const candidates = input.topicIds.length
        ? await transaction.topic.findMany({
          where: {
            id: { in: input.topicIds },
            programId: input.programId,
            publishedAt: { not: null },
            status: { in: VOTABLE_TOPIC_STATUSES },
          },
          select: {
            id: true,
            divisionId: true,
            authorId: true,
            managerId: true,
            assistants: { where: { userId: input.voterId }, select: { id: true } },
            team: { select: { members: { where: { studentId: input.voterId }, select: { id: true } } } },
          },
        })
        : [];
      if (candidates.length !== input.topicIds.length) return "INVALID_CANDIDATE";
      try { normalizeVoteSelection(input.topicIds, policy, candidates.map(({ id, divisionId }) => ({ id, divisionId }))); } catch { return "INVALID_CANDIDATE"; }
      if (!policy.selfVotingAllowed && candidates.some((candidate) =>
        candidate.authorId === input.voterId ||
        candidate.managerId === input.voterId ||
        candidate.assistants.length > 0 ||
        (candidate.team?.members.length ?? 0) > 0,
      )) return "SELF_VOTE_FORBIDDEN";

      await transaction.projectVote.deleteMany({ where: { programId: input.programId, voterId: input.voterId } });
      if (input.topicIds.length) {
        await transaction.projectVote.createMany({
          data: input.topicIds.map((topicId) => ({
            programId: input.programId,
            topicId,
            voterId: input.voterId,
            createdAt: input.votedAt,
          })),
        });
      }
      return "SAVED";
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async findResults(programId: string, now: Date): Promise<ProgramVotingResults | null> {
    const program = await this.client.projectProgram.findUnique({
      where: { id: programId },
      select: { id: true, name: true, votingPolicy: true },
    });
    if (!program?.votingPolicy) return null;
    const policy = program.votingPolicy;
    const named = policy.identityVisibility === "NAMED";
    const [topics, totalVotes, voters, namedVotes] = await Promise.all([
      this.client.topic.findMany({
        where: { programId, publishedAt: { not: null }, status: { in: VOTABLE_TOPIC_STATUSES } },
        orderBy: [{ title: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          divisionId: true,
          division: { select: { name: true, position: true } },
          _count: { select: { votes: { where: { programId } } } },
        },
      }),
      this.client.projectVote.count({ where: { programId } }),
      this.client.projectVote.groupBy({ by: ["voterId"], where: { programId } }),
      named
        ? this.client.projectVote.findMany({
          where: { programId },
          select: { topicId: true, voter: { select: { id: true, name: true, email: true } } },
        })
        : Promise.resolve([]),
    ]);
    const votersByTopic = new Map<string, Array<{ id: string; name: string; email: string }>>();
    for (const vote of namedVotes) {
      votersByTopic.set(vote.topicId, [...(votersByTopic.get(vote.topicId) ?? []), vote.voter]);
    }
    const sorted = topics
      .map((topic) => ({
        topicId: topic.id,
        title: topic.title,
        description: topic.description,
        divisionId: topic.divisionId,
        divisionName: topic.division?.name ?? null,
        divisionPosition: topic.division?.position ?? null,
        voteCount: topic._count.votes,
        voters: votersByTopic.get(topic.id) ?? [],
      }))
      .sort((left, right) => {
        return policySort(left, right, policy.voteLimitScope);
      });
    const divisionRanking = new Map<string, { count: number; priorVoteCount?: number; rank: number }>();
    const results = sorted.map((result) => {
      const key = policy.voteLimitScope === "DIVISION" ? result.divisionId ?? "UNASSIGNED" : "PROGRAM";
      const state = divisionRanking.get(key) ?? { count: 0, rank: 0 };
      state.count += 1;
      if (state.priorVoteCount !== result.voteCount) state.rank = state.count;
      state.priorVoteCount = result.voteCount;
      divisionRanking.set(key, state);
      return { ...result, rank: state.rank };
    });
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
}

function policySort(
  left: { title: string; divisionPosition?: number | null; voteCount?: number },
  right: { title: string; divisionPosition?: number | null; voteCount?: number },
  scope: ProgramVotingPolicyDetails["voteLimitScope"],
) {
  if (scope === "DIVISION") {
    const divisionComparison = divisionSortPosition(left.divisionPosition) - divisionSortPosition(right.divisionPosition);
    if (divisionComparison) return divisionComparison;
  }
  return (right.voteCount ?? 0) - (left.voteCount ?? 0) || left.title.localeCompare(right.title, "ko");
}

function divisionSortPosition(position: number | null | undefined) {
  return position ?? Number.MAX_SAFE_INTEGER;
}
