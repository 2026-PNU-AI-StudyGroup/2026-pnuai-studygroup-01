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

  async create(input: ProjectProgramDetails & { divisionNames?: string[]; votingPolicy: ProgramVotingPolicyDetails | null; createdById: string }): Promise<string | "DUPLICATE"> {
    try {
      return await this.client.$transaction(async (transaction) => {
        const { votingPolicy, divisionNames = [], ...program } = input;
        const created = await transaction.projectProgram.create({
          data: {
            ...program,
            isPublic: false,
            lifecycleStatus: "ACTIVE",
            votingPolicy: votingPolicy ? { create: votingPolicy } : undefined,
            divisions: divisionNames.length ? { create: divisionNames.map((name, position) => ({ name, position })) } : undefined,
          },
          select: { id: true },
        });
        await enqueueTranslations(transaction, [input.name, input.category, input.description]);
        return created.id;
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
  listPublic(): Promise<ProjectProgramRecord[]> { return this.list({ isPublic: true }); }
  listOpen(): Promise<ProjectProgramRecord[]> { return this.listPublic(); }
  listSidebarVisible(now: Date): Promise<ProjectProgramRecord[]> {
    // Visibility is an explicit setting and does not expire with the operating period.
    void now;
    return this.list({
      OR: [
        { isPublic: true },
      ],
    });
  }
  async findById(id: string): Promise<ProjectProgramRecord | null> {
    return (await this.list({ id }))[0] ?? null;
  }

  private async list(where: Prisma.ProjectProgramWhereInput): Promise<ProjectProgramRecord[]> {
    const programs = await this.client.projectProgram.findMany({
      where, orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      include: {
        topics: { select: { team: { select: { id: true } } } },
        divisions: { orderBy: { position: "asc" }, select: { id: true, name: true, position: true } },
        votingPolicy: true,
      },
    });
    return programs.map(({ topics, ...program }) => ({
      ...program,
      status: program.lifecycleStatus === "CLOSED" ? "CLOSED" : program.isPublic ? "OPEN" : "DRAFT",
      startYear: getProgramStartYear(program.startsAt),
      topicCount: topics.length,
      teamCount: topics.filter(({ team }) => team !== null).length,
    }));
  }

  async updateSettings(id: string, input: ProjectProgramSettings, actorId: string): Promise<UpdateProjectProgramSettingsOutcome> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      if (!programs[0]) return "NOT_FOUND";

      const currentPolicy = await transaction.programVotingPolicy.findUnique({ where: { programId: id } });
      const voteCount = currentPolicy
        ? await transaction.projectVote.count({ where: { programId: id } })
        : 0;
      const [reportDeadlineConflict, guidanceScheduleConflict] = await Promise.all([
        transaction.report.findFirst({
          where: {
            team: { programId: id },
            OR: [
              { dueAt: { lt: input.executionStartsAt } },
              { dueAt: { gt: input.submissionEndsAt } },
            ],
          },
          select: { id: true },
        }),
        transaction.projectGuidanceRequest.findFirst({
          where: {
            team: { programId: id },
            scheduledAt: { gt: input.executionEndsAt },
          },
          select: { id: true },
        }),
      ]);
      if (reportDeadlineConflict || guidanceScheduleConflict) return "DEPENDENT_SCHEDULE_CONFLICT";

      const divisionCount = await transaction.programDivision.count({ where: { programId: id } });
      if (input.votingPolicy?.voteLimitScope === "DIVISION" && divisionCount === 0) return "DIVISIONS_REQUIRED";

      if (!input.votingPolicy) {
        if (currentPolicy && voteCount > 0) return "VOTING_POLICY_HAS_VOTES";
        if (currentPolicy) await transaction.programVotingPolicy.delete({ where: { programId: id } });
      } else if (currentPolicy) {
        const requestedScope = input.votingPolicy.voteLimitScope ?? "PROGRAM";
        const policyChanged = currentPolicy.voteLimit !== input.votingPolicy.voteLimit || currentPolicy.voteLimitScope !== requestedScope;
        const resetConfirmed = input.confirmVoteReset?.voteCount === voteCount &&
          input.confirmVoteReset.from.voteLimit === currentPolicy.voteLimit &&
          input.confirmVoteReset.from.voteLimitScope === currentPolicy.voteLimitScope &&
          input.confirmVoteReset.to.voteLimit === input.votingPolicy.voteLimit &&
          input.confirmVoteReset.to.voteLimitScope === requestedScope;
        if (voteCount > 0 && policyChanged && !resetConfirmed) return {
          status: "VOTE_RESET_CONFIRMATION_REQUIRED" as const,
          impact: {
            voteCount,
            from: { voteLimit: currentPolicy.voteLimit, voteLimitScope: currentPolicy.voteLimitScope },
            to: { voteLimit: input.votingPolicy.voteLimit, voteLimitScope: requestedScope },
          },
        };
        if (voteCount > 0 && currentPolicy.identityVisibility !== input.votingPolicy.identityVisibility) {
          return "IDENTITY_VISIBILITY_LOCKED";
        }
        if (!policyChanged && input.votingPolicy.voteLimit < currentPolicy.voteLimit) {
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
        if (voteCount > 0 && policyChanged) {
          await transaction.projectVote.deleteMany({ where: { programId: id } });
          await transaction.auditLog.create({ data: { actorId, action: "PROGRAM_VOTING_RESET", targetType: "PROJECT_PROGRAM", targetId: id, metadata: { reason: "POLICY_CHANGED", voteCount, from: { voteLimit: currentPolicy.voteLimit, voteLimitScope: currentPolicy.voteLimitScope }, to: { voteLimit: input.votingPolicy.voteLimit, voteLimitScope: requestedScope } } } });
        }
        await transaction.programVotingPolicy.update({ where: { programId: id }, data: input.votingPolicy });
      } else {
        await transaction.programVotingPolicy.create({ data: { programId: id, ...input.votingPolicy } });
      }

      await transaction.projectProgram.update({
        where: { id },
        data: {
          name: input.name,
          category: input.category,
          description: input.description,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          advisorEnabled: input.advisorEnabled,
          projectRegistrationStartsAt: input.projectRegistrationStartsAt,
          projectRegistrationEndsAt: input.projectRegistrationEndsAt,
          recruitmentStartsAt: input.recruitmentStartsAt,
          recruitmentEndsAt: input.recruitmentEndsAt,
          executionStartsAt: input.executionStartsAt,
          executionEndsAt: input.executionEndsAt,
          submissionStartsAt: input.submissionStartsAt,
          submissionEndsAt: input.submissionEndsAt,
        },
      });
      return "UPDATED";
    });
  }

  setPublic(id: string, isPublic: boolean, changedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string; firstPublishedAt: Date | null }>>(Prisma.sql`
        SELECT "id", "firstPublishedAt" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      const program = rows[0];
      if (!program) return false;
      await transaction.projectProgram.update({
        where: { id },
        data: {
          isPublic,
          firstPublishedAt: isPublic && program.firstPublishedAt === null ? changedAt : undefined,
        },
      });
      return true;
    });
  }

  close(id: string, changedById: string, changedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      if (!rows[0]) return false;
      const result = await transaction.projectProgram.updateMany({
        where: { id, lifecycleStatus: "ACTIVE" },
        data: { lifecycleStatus: "CLOSED", closedAt: changedAt },
      });
      if (result.count !== 1) return false;
      {
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
            decidedById: changedById,
            decidedAt: changedAt,
          },
        });
        await transaction.topic.updateMany({ where: { id: { in: topicIds }, status: "PENDING_APPROVAL" }, data: { status: "REJECTED" } });
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

  changeStatus(id: string, status: "OPEN" | "CLOSED", changedById: string, changedAt: Date): Promise<boolean> {
    return status === "OPEN" ? this.setPublic(id, true, changedAt) : this.close(id, changedById, changedAt);
  }

  async changeStudentProjectCreation(id: string, enabled: boolean): Promise<boolean> {
    const result = await this.client.projectProgram.updateMany({
      where: { id, lifecycleStatus: "ACTIVE" },
      data: { studentProjectCreationEnabled: enabled },
    });
    return result.count === 1;
  }

  async changeIcon(id: string, icon: ProgramIconKey): Promise<boolean> {
    const result = await this.client.projectProgram.updateMany({ where: { id }, data: { icon } });
    return result.count === 1;
  }

  findPublicActive(id: string): Promise<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    projectRegistrationStartsAt: Date;
    projectRegistrationEndsAt: Date;
    recruitmentStartsAt: Date;
    recruitmentEndsAt: Date;
    executionStartsAt: Date;
    executionEndsAt: Date;
    submissionStartsAt: Date;
    submissionEndsAt: Date;
    advisorEnabled: boolean;
    studentProjectCreationEnabled: boolean;
  } | null> {
    return this.client.projectProgram.findFirst({
      where: { id, isPublic: true, lifecycleStatus: "ACTIVE" },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        projectRegistrationStartsAt: true,
        projectRegistrationEndsAt: true,
        recruitmentStartsAt: true,
        recruitmentEndsAt: true,
        executionStartsAt: true,
        executionEndsAt: true,
        submissionStartsAt: true,
        submissionEndsAt: true,
        advisorEnabled: true,
        studentProjectCreationEnabled: true,
      },
    });
  }

  findOpen(id: string) {
    return this.findPublicActive(id);
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
