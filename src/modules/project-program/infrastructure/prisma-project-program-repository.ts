import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { finalizeProgram } from "@/modules/project-program/infrastructure/prisma-program-lifecycle";
import type {
  ProjectProgramRecord,
  ProjectProgramRepository,
  ProjectProgramCreateSetup,
  ProjectProgramSettings,
  UpdateProjectProgramSettingsOutcome,
} from "@/modules/project-program/application/manage-project-programs";
import { getProgramStartYear, type ProjectProgramDetails } from "@/modules/project-program/domain/project-program-policy";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaProjectProgramRepository implements ProjectProgramRepository {
  constructor(private readonly client: PrismaClient) {}

  async create(input: ProjectProgramDetails & ProjectProgramCreateSetup & { createdById: string }): Promise<string | "DUPLICATE"> {
    try {
      return await this.client.$transaction(async (transaction) => {
        const { votingPolicy, divisionNames = [], rubricDefinitions = [], reportDefinitions = [], ...program } = input;
        const created = await transaction.projectProgram.create({
          data: {
            ...program,
            isStudentPublic: false,
            isFacultyPublic: false,
            votingPolicy: votingPolicy ? { create: votingPolicy } : undefined,
            divisions: divisionNames.length ? { create: divisionNames.map((name, position) => ({ name, position })) } : undefined,
          },
          select: { id: true },
        });
        const divisions = divisionNames.length
          ? await transaction.programDivision.findMany({ where: { programId: created.id }, select: { id: true, name: true } })
          : [];
        const divisionByName = new Map(divisions.map((division) => [division.name.toLocaleLowerCase("ko-KR"), division.id]));
        const customDivisionIds = [...new Set(rubricDefinitions.flatMap((rubric) => rubric.divisionName ? [divisionByName.get(rubric.divisionName.toLocaleLowerCase("ko-KR"))] : []).filter((id): id is string => Boolean(id)))];
        if (customDivisionIds.length) await transaction.programDivision.updateMany({ where: { id: { in: customDivisionIds }, programId: created.id }, data: { rubricMode: "CUSTOM" } });
        for (const [position, rubric] of rubricDefinitions.entries()) {
          const divisionId = rubric.divisionName ? divisionByName.get(rubric.divisionName.toLocaleLowerCase("ko-KR")) : null;
          await transaction.rubricDefinition.create({
            data: {
              programId: created.id,
              divisionId,
              title: rubric.title,
              gradingDueAt: rubric.gradingDueAt,
              audience: rubric.audience,
              position,
              criteria: rubric.criteria.length ? { create: rubric.criteria.map((criterion, criterionPosition) => ({ ...criterion, position: criterionPosition })) } : undefined,
            },
          });
        }
        if (reportDefinitions.length) await transaction.programReportDefinition.createMany({ data: reportDefinitions.map((definition, position) => ({ programId: created.id, ...definition, position })) });
        await enqueueTranslations(transaction, [input.name, input.category, input.description, ...rubricDefinitions.flatMap((rubric) => [rubric.title, ...rubric.criteria.map((criterion) => criterion.label)]), ...reportDefinitions.map((definition) => definition.title)]);
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
  listPublic(audience: "STUDENT" | "FACULTY" = "STUDENT"): Promise<ProjectProgramRecord[]> {
    return this.list(audience === "STUDENT" ? { isStudentPublic: true } : { isFacultyPublic: true });
  }
  listOpen(): Promise<ProjectProgramRecord[]> { return this.listPublic(); }
  listSidebarVisible(now: Date, audience: "STUDENT" | "FACULTY" = "STUDENT"): Promise<ProjectProgramRecord[]> {
    // Visibility is an explicit setting and does not expire with the operating period.
    void now;
    return this.list(audience === "STUDENT" ? { isStudentPublic: true } : { isFacultyPublic: true });
  }
  async findById(id: string): Promise<ProjectProgramRecord | null> {
    return (await this.list({ id }))[0] ?? null;
  }

  private async list(where: Prisma.ProjectProgramWhereInput): Promise<ProjectProgramRecord[]> {
    const programs = await this.client.projectProgram.findMany({
      where, orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      include: {
        topics: { select: { projectTeam: { select: { id: true } } } },
        divisions: { orderBy: { position: "asc" }, select: { id: true, name: true, position: true } },
        votingPolicy: true,
      },
    });
    return programs.map(({ topics, ...program }) => ({
      ...program,
      status: program.endsAt <= new Date() ? "CLOSED" : program.isStudentPublic || program.isFacultyPublic ? "OPEN" : "DRAFT",
      startYear: getProgramStartYear(program.startsAt),
      topicCount: topics.length,
      teamCount: topics.filter(({ projectTeam }) => projectTeam !== null).length,
    }));
  }

  async updateSettings(id: string, input: ProjectProgramSettings, actorId: string): Promise<UpdateProjectProgramSettingsOutcome> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string; endsAt: Date }>>(Prisma.sql`
        SELECT "id", "endsAt" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      if (!programs[0]) return "NOT_FOUND";

      const currentPolicy = await transaction.programVotingPolicy.findUnique({ where: { programId: id } });
      const voteCount = currentPolicy
        ? await transaction.projectVote.count({ where: { programId: id } })
        : 0;
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
          endProcessedAt: input.endsAt && input.endsAt > new Date() && input.endsAt.getTime() !== programs[0].endsAt.getTime()
            ? null
            : undefined,
        },
      });
      return "UPDATED";
    });
  }

  setVisibility(id: string, audience: "STUDENT" | "FACULTY", visible: boolean, changedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string; firstPublishedAt: Date | null }>>(Prisma.sql`
        SELECT "id", "firstPublishedAt" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      const program = rows[0];
      if (!program) return false;
      await transaction.projectProgram.update({
        where: { id },
        data: {
          ...(audience === "STUDENT" ? { isStudentPublic: visible } : { isFacultyPublic: visible }),
          firstPublishedAt: visible && program.firstPublishedAt === null ? changedAt : undefined,
        },
      });
      return true;
    });
  }

  close(id: string, changedById: string, changedAt: Date): Promise<boolean> {
    return finalizeProgram(this.client, {
      programId: id,
      actor: { kind: "USER", id: changedById },
      processedAt: changedAt,
      endsAt: changedAt,
    });
  }

  changeStatus(id: string, status: "OPEN" | "CLOSED", changedById: string, changedAt: Date): Promise<boolean> {
    return status === "OPEN" ? this.setVisibility(id, "STUDENT", true, changedAt) : this.close(id, changedById, changedAt);
  }

  async changeStudentProjectPolicy(id: string, input: { enabled: boolean; minSize: number; maxSize: number }): Promise<boolean> {
    const result = await this.client.projectProgram.updateMany({
      where: { id },
      data: {
        studentProjectCreationEnabled: input.enabled,
        projectTeamMinSize: input.minSize,
        projectTeamMaxSize: input.maxSize,
      },
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
    projectTeamMinSize: number;
    projectTeamMaxSize: number;
  } | null> {
    return this.client.projectProgram.findFirst({
      where: { id, isStudentPublic: true, endsAt: { gt: new Date() } },
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
        projectTeamMinSize: true,
        projectTeamMaxSize: true,
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
    LEFT JOIN "project_team"
      ON "project_team"."projectId" = "topic"."id"
    LEFT JOIN "project_team_membership"
      ON "project_team_membership"."projectTeamId" = "project_team"."id"
      AND "project_team_membership"."userId" = "project_vote"."voterId"
      AND "project_team_membership"."endedAt" IS NULL
    WHERE "project_vote"."programId" = ${programId}
      AND (
        "topic"."authorId" = "project_vote"."voterId"
        OR "topic"."managerId" = "project_vote"."voterId"
        OR "project_assistant"."id" IS NOT NULL
        OR "project_team_membership"."id" IS NOT NULL
      )
    LIMIT 1
  `);
  return Boolean(votes[0]);
}

function isProgramIdentityConflict(target: unknown): boolean {
  return Array.isArray(target) && target.includes("name") && target.includes("startsAt");
}
