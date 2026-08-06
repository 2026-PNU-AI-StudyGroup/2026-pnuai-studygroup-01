import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type {
  ProjectProgramRecord,
  ProjectProgramRepository,
  ProjectProgramSettings,
  UpdateProjectProgramSettingsOutcome,
} from "@/modules/project-program/application/manage-project-programs";
import { getProgramStartYear, type ProgramVotingPolicyDetails, type ProjectProgramDetails } from "@/modules/project-program/domain/project-program-policy";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaProjectProgramRepository implements ProjectProgramRepository {
  constructor(private readonly client: PrismaClient) {}

  async create(input: ProjectProgramDetails & { votingPolicy: ProgramVotingPolicyDetails | null; createdById: string }): Promise<"CREATED" | "DUPLICATE"> {
    try {
      return await this.client.$transaction(async (transaction) => {
        const { votingPolicy, ...program } = input;
        await transaction.projectProgram.create({
          data: {
            ...program,
            status: "DRAFT",
            openedAt: null,
            votingPolicy: votingPolicy ? { create: votingPolicy } : undefined,
          },
        });
        await enqueueTranslations(transaction, [input.name, input.category, input.description]);
        return "CREATED" as const;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        isProgramIdentityConflict(error.meta?.target)
      ) return "DUPLICATE";
      throw error;
    }
  }

  listAll(): Promise<ProjectProgramRecord[]> { return this.list({}); }
  listOpen(): Promise<ProjectProgramRecord[]> { return this.list({ status: "OPEN" }); }
  async findById(id: string): Promise<ProjectProgramRecord | null> {
    return (await this.list({ id }))[0] ?? null;
  }

  private async list(where: Prisma.ProjectProgramWhereInput): Promise<ProjectProgramRecord[]> {
    const programs = await this.client.projectProgram.findMany({
      where, orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      include: {
        topics: { select: { status: true, team: { select: { id: true } } } },
        votingPolicy: true,
      },
    });
    return programs.map(({ topics, ...program }) => ({
      ...program,
      startYear: getProgramStartYear(program.startsAt),
      topicCount: topics.filter(({ status }) => status === "PUBLISHED").length,
      teamCount: topics.filter(({ team }) => team !== null).length,
    }));
  }

  async updateSettings(id: string, input: ProjectProgramSettings): Promise<UpdateProjectProgramSettingsOutcome> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      if (!programs[0]) return "NOT_FOUND";

      const currentPolicy = await transaction.programVotingPolicy.findUnique({ where: { programId: id } });
      const voteCount = currentPolicy
        ? await transaction.projectVote.count({ where: { programId: id } })
        : 0;

      if (!input.votingPolicy) {
        if (currentPolicy && voteCount > 0) return "VOTING_POLICY_HAS_VOTES";
        if (currentPolicy) await transaction.programVotingPolicy.delete({ where: { programId: id } });
      } else if (currentPolicy) {
        if (voteCount > 0 && currentPolicy.identityVisibility !== input.votingPolicy.identityVisibility) {
          return "IDENTITY_VISIBILITY_LOCKED";
        }
        if (input.votingPolicy.voteLimit < currentPolicy.voteLimit) {
          const voterCounts = await transaction.projectVote.groupBy({
            by: ["voterId"],
            where: { programId: id },
            _count: { _all: true },
          });
          if (voterCounts.some(({ _count }) => _count._all > input.votingPolicy!.voteLimit)) {
            return "VOTE_LIMIT_CONFLICT";
          }
        }
        const votesOutsidePeriod = await transaction.projectVote.findFirst({
          where: {
            programId: id,
            OR: [
              { createdAt: { lt: input.votingPolicy.startsAt } },
              { createdAt: { gte: input.votingPolicy.endsAt } },
            ],
          },
          select: { id: true },
        });
        if (votesOutsidePeriod) return "VOTE_PERIOD_CONFLICT";
        if (currentPolicy.selfVotingAllowed && !input.votingPolicy.selfVotingAllowed) {
          const selfVote = await findSelfVote(transaction, id);
          if (selfVote) return "SELF_VOTE_CONFLICT";
        }
        await transaction.programVotingPolicy.update({ where: { programId: id }, data: input.votingPolicy });
      } else {
        await transaction.programVotingPolicy.create({ data: { programId: id, ...input.votingPolicy } });
      }

      await transaction.projectProgram.update({
        where: { id },
        data: {
          projectRegistrationStartsAt: input.projectRegistrationStartsAt,
          projectRegistrationEndsAt: input.projectRegistrationEndsAt,
        },
      });
      return "UPDATED";
    });
  }

  changeStatus(id: string, status: "OPEN" | "CLOSED", changedById: string, changedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      if (!rows[0]) return false;
      const result = await transaction.projectProgram.updateMany({
        where: status === "OPEN"
          ? { id, status: "DRAFT", endsAt: { gt: changedAt } }
          : { id, status: "OPEN" },
        data: status === "OPEN" ? { status, openedAt: changedAt } : { status },
      });
      if (result.count !== 1) return false;
      if (status === "CLOSED") {
        const topicIds = (await transaction.topic.findMany({ where: { programId: id }, select: { id: true } })).map(({ id: topicId }) => topicId);
        const applications = await transaction.topicApplication.findMany({
          where: { topicId: { in: topicIds }, status: "PENDING" },
          select: { id: true, studentId: true, topic: { select: { title: true } } },
        });
        await transaction.topicApprovalRequest.updateMany({
          where: { topicId: { in: topicIds }, status: "PENDING" },
          data: {
            status: "REJECTED",
            reviewComment: "프로그램 종료로 승인 요청이 자동 종료되었습니다.",
            decidedAt: changedAt,
          },
        });
        await transaction.topic.updateMany({ where: { id: { in: topicIds }, status: "PUBLISHED" }, data: { status: "CLOSED" } });
        await transaction.topicApplication.updateMany({
          where: { topicId: { in: topicIds }, status: "PENDING" },
          data: {
            status: "REJECTED",
            decidedAt: changedAt,
            decidedById: changedById,
            reviewComment: "프로그램이 종료되어 자동 미선정되었습니다.",
          },
        });
        await transaction.recruitmentPost.updateMany({ where: { team: { topicId: { in: topicIds } }, status: "OPEN" }, data: { status: "CLOSED" } });
        await transaction.recruitmentApplication.updateMany({ where: { post: { team: { topicId: { in: topicIds } } }, status: "PENDING" }, data: { status: "REJECTED", decidedAt: changedAt } });
        await createApplicationResultNotifications(transaction, applications.map((application) => ({
          applicationId: application.id,
          recipientId: application.studentId,
          topicTitle: application.topic.title,
          outcome: "REJECTED",
          createdAt: changedAt,
        })));
      }
      return true;
    });
  }

  async changeStudentProjectCreation(id: string, enabled: boolean): Promise<boolean> {
    const result = await this.client.projectProgram.updateMany({
      where: { id, status: { not: "CLOSED" } },
      data: { studentProjectCreationEnabled: enabled },
    });
    return result.count === 1;
  }

  async changeIcon(id: string, icon: ProgramIconKey): Promise<boolean> {
    const result = await this.client.projectProgram.updateMany({ where: { id }, data: { icon } });
    return result.count === 1;
  }

  findOpen(id: string): Promise<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    projectRegistrationStartsAt: Date;
    projectRegistrationEndsAt: Date;
    advisorEnabled: boolean;
    studentProjectCreationEnabled: boolean;
  } | null> {
    return this.client.projectProgram.findFirst({
      where: { id, status: "OPEN" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        projectRegistrationStartsAt: true,
        projectRegistrationEndsAt: true,
        advisorEnabled: true,
        studentProjectCreationEnabled: true,
      },
    });
  }
}

async function findSelfVote(transaction: Prisma.TransactionClient, programId: string): Promise<boolean> {
  const votes = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "project_vote"."id"
    FROM "project_vote"
    JOIN "topic" ON "topic"."id" = "project_vote"."topicId"
      AND "topic"."programId" = "project_vote"."programId"
    LEFT JOIN "project_assistant"
      ON "project_assistant"."topicId" = "topic"."id"
      AND "project_assistant"."userId" = "project_vote"."voterId"
    LEFT JOIN "team_member"
      ON "team_member"."topicId" = "topic"."id"
      AND "team_member"."programId" = "project_vote"."programId"
      AND "team_member"."studentId" = "project_vote"."voterId"
    WHERE "project_vote"."programId" = ${programId}
      AND (
        "topic"."authorId" = "project_vote"."voterId"
        OR "topic"."managerId" = "project_vote"."voterId"
        OR "project_assistant"."id" IS NOT NULL
        OR "team_member"."id" IS NOT NULL
      )
    LIMIT 1
  `);
  return Boolean(votes[0]);
}

function isProgramIdentityConflict(target: unknown): boolean {
  return Array.isArray(target) && target.includes("name") && target.includes("startsAt");
}
