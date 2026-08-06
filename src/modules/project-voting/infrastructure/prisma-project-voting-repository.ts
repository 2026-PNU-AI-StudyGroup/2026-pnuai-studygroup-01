import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ProgramVotingPolicyDetails } from "@/modules/project-program/domain/project-program-policy";
import {
  getProgramVotingPhase,
  type ProgramVoteBallot,
  type ProgramVotingResults,
  type ProjectVotingRepository,
  type ReplaceProgramVotesOutcome,
} from "@/modules/project-voting/application/manage-project-voting";

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
        votingPolicy: true,
      },
    });
    if (!program?.votingPolicy) return null;
    const [candidates, votes] = await Promise.all([
      this.client.topic.findMany({
        where: { programId, publishedAt: { not: null }, status: { in: VOTABLE_TOPIC_STATUSES } },
        orderBy: [{ title: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
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
      policy: program.votingPolicy,
      phase: getProgramVotingPhase(program.votingPolicy, now),
      candidates: candidates.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        description: candidate.description,
        isSelfProject: candidate.authorId === voterId ||
          candidate.managerId === voterId ||
          candidate.assistants.length > 0 ||
          (candidate.team?.members.length ?? 0) > 0,
      })),
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
          "program_voting_policy"."selfVotingAllowed",
          "program_voting_policy"."identityVisibility"
        FROM "project_program"
        JOIN "program_voting_policy"
          ON "program_voting_policy"."programId" = "project_program"."id"
        WHERE "project_program"."id" = ${input.programId}
        FOR UPDATE OF "project_program", "program_voting_policy"
      `);
      const policy = policies[0];
      if (!policy) return "NOT_FOUND";
      if (getProgramVotingPhase(policy, input.votedAt) !== "OPEN") return "NOT_OPEN";
      if (input.topicIds.length > policy.voteLimit) return "INVALID_CANDIDATE";

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
            authorId: true,
            managerId: true,
            assistants: { where: { userId: input.voterId }, select: { id: true } },
            team: { select: { members: { where: { studentId: input.voterId }, select: { id: true } } } },
          },
        })
        : [];
      if (candidates.length !== input.topicIds.length) return "INVALID_CANDIDATE";
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
    const named = program.votingPolicy.identityVisibility === "NAMED";
    const [topics, totalVotes, voters] = await Promise.all([
      this.client.topic.findMany({
        where: { programId, publishedAt: { not: null }, status: { in: VOTABLE_TOPIC_STATUSES } },
        orderBy: [{ title: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          _count: { select: { votes: { where: { programId } } } },
          votes: { where: { programId }, select: { voter: { select: { id: true, name: true, email: true } } } },
        },
      }),
      this.client.projectVote.count({ where: { programId } }),
      this.client.projectVote.groupBy({ by: ["voterId"], where: { programId } }),
    ]);
    const sorted = topics
      .map((topic) => ({
        topicId: topic.id,
        title: topic.title,
        description: topic.description,
        voteCount: topic._count.votes,
        voters: named ? topic.votes.map(({ voter }) => voter) : [],
      }))
      .sort((left, right) => right.voteCount - left.voteCount || left.title.localeCompare(right.title, "ko"));
    let priorVoteCount: number | undefined;
    let rank = 0;
    const results = sorted.map((result, index) => {
      if (priorVoteCount !== result.voteCount) rank = index + 1;
      priorVoteCount = result.voteCount;
      return { ...result, rank };
    });
    return {
      programId: program.id,
      programName: program.name,
      policy: program.votingPolicy,
      phase: getProgramVotingPhase(program.votingPolicy, now),
      totalVotes,
      participantCount: voters.length,
      results,
    };
  }
}
