import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { finalizeProgram } from "@/modules/project-program/infrastructure/prisma-program-lifecycle";
import type {
  ProjectProgramRecord,
  ProjectProgramRepository,
  ProjectProgramCreateSetup,
  ProjectProgramBasicInfoUpdate,
  ProjectProgramSettings,
  ProjectProgramScheduleUpdate,
  ProgramDivisionSyncImpact,
  ChangeStudentProjectPolicyOutcome,
  UpdateProjectProgramBasicInfoOutcome,
  UpdateProjectProgramScheduleOutcome,
  UpdateProjectProgramSettingsOutcome,
} from "@/modules/project-program/application/manage-project-programs";
import { getProgramStartYear, normalizeProjectProgram, type ProjectProgramDetails } from "@/modules/project-program/domain/project-program-policy";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";
import { enqueueTranslations } from "@/modules/translation/application/translation-queue";

export class PrismaProjectProgramRepository implements ProjectProgramRepository {
  constructor(private readonly client: PrismaClient) {}

  async create(input: ProjectProgramDetails & ProjectProgramCreateSetup & { createdById: string }): Promise<string | "DUPLICATE"> {
    try {
      return await this.client.$transaction(async (transaction) => {
        const {
          votingPolicy,
          divisionNames = [],
          rubricDefinitions = [],
          reportDefinitions = [],
          isPublic = false,
          ...program
        } = input;
        const created = await transaction.projectProgram.create({
          data: {
            ...program,
            isPublic,
            votingPolicy: votingPolicy ? { create: votingPolicy } : undefined,
            divisions: divisionNames.length ? { create: divisionNames.map((name, position) => ({ name, position })) } : undefined,
          },
          select: { id: true },
        });
        const divisions = divisionNames.length
          ? await transaction.programDivision.findMany({ where: { programId: created.id }, select: { id: true, name: true } })
          : [];
        const divisionByName = new Map(divisions.map((division) => [division.name.toLocaleLowerCase("ko-KR"), division.id]));
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
        if (reportDefinitions.length) await transaction.programReportDefinition.createMany({ data: reportDefinitions.map((definition, position) => ({ programId: created.id, ...definition, required: definition.required ?? true, position })) });
        await enqueueTranslations(transaction, [input.name, input.category, ...rubricDefinitions.flatMap((rubric) => [rubric.title, ...rubric.criteria.map((criterion) => criterion.label)]), ...reportDefinitions.map((definition) => definition.title)]);
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
  listPublic(): Promise<ProjectProgramRecord[]> {
    return this.list({ isPublic: true });
  }
  listOpen(): Promise<ProjectProgramRecord[]> { return this.listPublic(); }
  listSidebarVisible(now: Date): Promise<ProjectProgramRecord[]> {
    // Visibility is an explicit setting and does not expire with the operating period.
    void now;
    return this.list({ isPublic: true });
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
      status: program.endsAt <= new Date() ? "CLOSED" : program.isPublic ? "OPEN" : "DRAFT",
      startYear: getProgramStartYear(program.startsAt),
      topicCount: topics.length,
      teamCount: topics.filter(({ projectTeam }) => projectTeam !== null).length,
    }));
  }

  async updateBasicInfo(id: string, input: ProjectProgramBasicInfoUpdate, actorId: string): Promise<UpdateProjectProgramBasicInfoOutcome> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string; isPublic: boolean; firstPublishedAt: Date | null }>>(Prisma.sql`
        SELECT "id", "isPublic", "firstPublishedAt"
        FROM "project_program"
        WHERE "id" = ${id}
        FOR UPDATE
      `);
      const program = rows[0];
      if (!program) return "NOT_FOUND";

      const divisions = await transaction.programDivision.findMany({
        where: { programId: id },
        orderBy: { position: "asc" },
        select: { id: true, name: true, position: true, _count: { select: { topics: true } } },
      });
      const desiredByKey = new Map(input.divisionNames.map((name) => [divisionKey(name), name]));
      const retainedByKey = new Map(divisions.filter((division) => desiredByKey.has(divisionKey(division.name))).map((division) => [divisionKey(division.name), division]));
      const removed = divisions.filter((division) => !desiredByKey.has(divisionKey(division.name)));
      const removedIds = removed.map((division) => division.id);
      const policy = removedIds.length
        ? await transaction.programVotingPolicy.findUnique({ where: { programId: id }, select: { voteLimitScope: true } })
        : null;
      const projectCount = removed.reduce((total, division) => total + division._count.topics, 0);
      const voteCount = removedIds.length ? await transaction.projectVote.count({ where: { programId: id } }) : 0;
      const switchesVotingScope = removedIds.length > 0 && input.divisionNames.length === 0 && policy?.voteLimitScope === "DIVISION";
      const impact: ProgramDivisionSyncImpact = {
        divisionIds: removedIds,
        divisionNames: removed.map((division) => division.name),
        projectCount,
        voteCount,
        switchesVotingScope,
      };

      if (removedIds.length) {
        const projectTeamIds = (await transaction.projectTeam.findMany({
          where: { project: { programId: id, divisionId: { in: removedIds } } },
          select: { id: true },
        })).map((team) => team.id);
        const divisionRubricIds = (await transaction.rubricDefinition.findMany({
          where: { programId: id, divisionId: { in: removedIds } },
          select: { id: true },
        })).map((rubric) => rubric.id);
        if (divisionRubricIds.length) {
          const [staffScore, advisorEvaluation] = await Promise.all([
            transaction.rubricScore.findFirst({ where: { evaluation: { rubricId: { in: divisionRubricIds } } }, select: { id: true } }),
            transaction.advisorEvaluation.findFirst({ where: { rubricId: { in: divisionRubricIds } }, select: { id: true } }),
          ]);
          if (staffScore || advisorEvaluation) return "SCORED_RUBRIC";
        }
        if ((projectCount > 0 || voteCount > 0 || switchesVotingScope) && !sameDivisionSyncImpact(input.confirmDivisionSync, impact)) {
          return { status: "DIVISION_SYNC_CONFIRMATION_REQUIRED", impact };
        }

        if (divisionRubricIds.length) {
          await transaction.projectTeamRubricEvaluation.deleteMany({ where: { rubricId: { in: divisionRubricIds } } });
          await transaction.rubricDefinition.deleteMany({ where: { id: { in: divisionRubricIds } } });
        }
        await transaction.topic.updateMany({ where: { programId: id, divisionId: { in: removedIds } }, data: { divisionId: null } });
        const commonRubricIds = (await transaction.rubricDefinition.findMany({
          where: { programId: id, divisionId: null, archivedAt: null, legacy: false },
          select: { id: true },
        })).map((rubric) => rubric.id);
        if (projectTeamIds.length && commonRubricIds.length) {
          await transaction.projectTeamRubricEvaluation.createMany({
            data: projectTeamIds.flatMap((projectTeamId) => commonRubricIds.map((rubricId) => ({ projectTeamId, rubricId }))),
            skipDuplicates: true,
          });
        }
        if (voteCount) {
          await transaction.projectVote.deleteMany({ where: { programId: id } });
          await transaction.auditLog.create({ data: { actorId, action: "PROGRAM_VOTING_RESET", targetType: "PROJECT_PROGRAM", targetId: id, metadata: { reason: "DIVISION_DELETED", voteCount } } });
        }
        if (switchesVotingScope) await transaction.programVotingPolicy.update({ where: { programId: id }, data: { voteLimitScope: "PROGRAM" } });
        await transaction.programDivision.deleteMany({ where: { id: { in: removedIds } } });
        for (const division of removed) {
          await transaction.auditLog.create({ data: { actorId, action: "PROGRAM_DIVISION_DELETED", targetType: "PROGRAM_DIVISION", targetId: division.id, metadata: { name: division.name, projectCount: division._count.topics, voteCount } } });
        }
      }

      const positionOffset = divisions.length + input.divisionNames.length + 1;
      if (divisions.length) await transaction.programDivision.updateMany({ where: { programId: id }, data: { position: { increment: positionOffset } } });
      for (const [position, name] of input.divisionNames.entries()) {
        const retained = retainedByKey.get(divisionKey(name));
        if (retained) {
          await transaction.programDivision.update({ where: { id: retained.id }, data: { name, position } });
          if (retained.name !== name || retained.position !== position) {
            await transaction.auditLog.create({ data: { actorId, action: "PROGRAM_DIVISION_UPDATED", targetType: "PROGRAM_DIVISION", targetId: retained.id, metadata: { name, position } } });
          }
        } else {
          const division = await transaction.programDivision.create({ data: { programId: id, name, position } });
          await transaction.auditLog.create({ data: { actorId, action: "PROGRAM_DIVISION_CREATED", targetType: "PROJECT_PROGRAM", targetId: id, metadata: { divisionId: division.id, name, position } } });
        }
      }

      await transaction.projectProgram.update({
        where: { id },
        data: {
          name: input.name,
          category: input.category,
          isPublic: input.isPublic,
          firstPublishedAt: input.isPublic && !program.isPublic && program.firstPublishedAt === null ? new Date() : undefined,
        },
      });
      return "UPDATED";
    });
  }

  async updateSettings(id: string, input: ProjectProgramSettings, actorId: string): Promise<UpdateProjectProgramSettingsOutcome> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string; endsAt: Date }>>(Prisma.sql`
        SELECT "id", "endsAt" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      if (!programs[0]) return "NOT_FOUND";

      if (input.votingPolicy !== undefined) {
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
        const periodChanged = currentPolicy.startsAt.getTime() !== input.votingPolicy.startsAt.getTime() ||
          currentPolicy.endsAt.getTime() !== input.votingPolicy.endsAt.getTime();
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
        if (periodChanged) {
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
        }
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
      }

      await transaction.projectProgram.update({
        where: { id },
        data: {
          name: input.name,
          category: input.category,
          isPublic: input.isPublic,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          advisorEnabled: input.advisorEnabled,
          projectRegistrationStartsAt: input.projectRegistrationStartsAt,
          projectRegistrationEndsAt: input.projectRegistrationEndsAt,
          recruitmentStartsAt: input.recruitmentStartsAt,
          recruitmentEndsAt: input.recruitmentEndsAt,
          executionStartsAt: input.executionStartsAt,
          executionEndsAt: input.executionEndsAt,
          endProcessedAt: input.endsAt && input.endsAt > new Date() && input.endsAt.getTime() !== programs[0].endsAt.getTime()
            ? null
            : undefined,
        },
      });
      return "UPDATED";
    });
  }

  async updateSchedule(id: string, input: ProjectProgramScheduleUpdate): Promise<UpdateProjectProgramScheduleOutcome> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      if (!rows[0]) return "NOT_FOUND";

      const current = await transaction.projectProgram.findUnique({ where: { id } });
      if (!current) return "NOT_FOUND";
      const transitionToDirect = input.transitionToDirect === true && current.studentProjectCreationEnabled;
      if (transitionToDirect) {
        const topic = await transaction.topic.findFirst({ where: { programId: id }, select: { id: true } });
        if (topic) return "TOPICS_EXIST";
      }

      const normalized = normalizeProjectProgram({
        ...current,
        ...input,
        studentProjectCreationEnabled: transitionToDirect ? false : current.studentProjectCreationEnabled,
        projectTeamMinSize: transitionToDirect ? 1 : current.projectTeamMinSize,
      });
      await transaction.projectProgram.update({
        where: { id },
        data: {
          startsAt: normalized.startsAt,
          endsAt: normalized.endsAt,
          projectRegistrationStartsAt: normalized.projectRegistrationStartsAt,
          projectRegistrationEndsAt: normalized.projectRegistrationEndsAt,
          recruitmentStartsAt: normalized.recruitmentStartsAt,
          recruitmentEndsAt: normalized.recruitmentEndsAt,
          executionStartsAt: normalized.executionStartsAt,
          executionEndsAt: normalized.executionEndsAt,
          studentProjectCreationEnabled: normalized.studentProjectCreationEnabled,
          projectTeamMinSize: normalized.projectTeamMinSize,
          projectTeamMaxSize: normalized.projectTeamMaxSize,
          endProcessedAt: normalized.endsAt > new Date() && normalized.endsAt.getTime() !== current.endsAt.getTime() ? null : undefined,
        },
      });
      return "UPDATED";
    });
  }

  setVisibility(id: string, visible: boolean, changedAt: Date): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const rows = await transaction.$queryRaw<Array<{ id: string; firstPublishedAt: Date | null }>>(Prisma.sql`
        SELECT "id", "firstPublishedAt" FROM "project_program" WHERE "id" = ${id} FOR UPDATE
      `);
      const program = rows[0];
      if (!program) return false;
      await transaction.projectProgram.update({
        where: { id },
        data: {
          isPublic: visible,
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
    return status === "OPEN" ? this.setVisibility(id, true, changedAt) : this.close(id, changedById, changedAt);
  }

  async changeStudentProjectPolicy(id: string, input: { enabled: boolean; minSize: number; maxSize: number; recruitmentStartsAt: Date | null; recruitmentEndsAt: Date | null; advisorEnabled?: boolean }): Promise<ChangeStudentProjectPolicyOutcome> {
    return this.client.$transaction(async (transaction) => {
      const programs = await transaction.$queryRaw<Array<{ id: string; studentProjectCreationEnabled: boolean }>>(Prisma.sql`
        SELECT "id", "studentProjectCreationEnabled"
        FROM "project_program"
        WHERE "id" = ${id}
        FOR UPDATE
      `);
      const program = programs[0];
      if (!program) return "NOT_FOUND";
      if (program.studentProjectCreationEnabled !== input.enabled) {
        const topic = await transaction.topic.findFirst({ where: { programId: id }, select: { id: true } });
        if (topic) return "TOPICS_EXIST";
      }
      await transaction.projectProgram.update({
        where: { id },
        data: {
          studentProjectCreationEnabled: input.enabled,
          projectTeamMinSize: input.minSize,
          projectTeamMaxSize: input.maxSize,
          recruitmentStartsAt: input.recruitmentStartsAt,
          recruitmentEndsAt: input.recruitmentEndsAt,
          advisorEnabled: input.advisorEnabled,
        },
      });
      return "UPDATED";
    });
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
    recruitmentStartsAt: Date | null;
    recruitmentEndsAt: Date | null;
    executionStartsAt: Date;
    executionEndsAt: Date;
    advisorEnabled: boolean;
    studentProjectCreationEnabled: boolean;
    projectTeamMinSize: number;
    projectTeamMaxSize: number;
  } | null> {
    return this.client.projectProgram.findFirst({
      where: { id, isPublic: true, endsAt: { gt: new Date() } },
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

function divisionKey(name: string) {
  return name.trim().toLocaleLowerCase("ko-KR");
}

function sameDivisionSyncImpact(expected: ProgramDivisionSyncImpact | undefined, actual: ProgramDivisionSyncImpact) {
  if (!expected || expected.projectCount !== actual.projectCount || expected.voteCount !== actual.voteCount || expected.switchesVotingScope !== actual.switchesVotingScope) return false;
  if (expected.divisionIds.length !== actual.divisionIds.length) return false;
  return expected.divisionIds.every((id) => actual.divisionIds.includes(id));
}

function isProgramIdentityConflict(target: unknown): boolean {
  return Array.isArray(target) && target.includes("name") && target.includes("startsAt");
}
