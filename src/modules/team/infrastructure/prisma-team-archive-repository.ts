import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { createApplicationResultNotifications } from "@/modules/notification/infrastructure/notification-events";
import type {
  ArchivedProject,
  ArchiveFilters,
  ArchivedProjectReader,
  TeamCloser,
} from "@/modules/team/application/archive-projects";

const archivedProjectSelect = {
  id: true,
  name: true,
  topic: { select: {
    title: true,
    description: true,
    requiredSkills: true,
    preferredSkills: true,
    program: { select: { name: true, category: true } },
    author: { select: { name: true } },
    academicCycle: { select: { academicYear: true, term: true } },
  } },
  members: { orderBy: { joinedAt: "asc" as const }, select: { student: { select: { name: true } } } },
  artifacts: { orderBy: { createdAt: "asc" as const }, select: {
    id: true,
    type: true,
    title: true,
    fileId: true,
    externalUrl: true,
    file: { select: { originalName: true } },
  } },
} satisfies Prisma.TeamSelect;

type ArchivedProjectRow = Prisma.TeamGetPayload<{ select: typeof archivedProjectSelect }>;

function toArchivedProject(team: ArchivedProjectRow): ArchivedProject {
  return {
    id: team.id,
    academicYear: team.topic.academicCycle.academicYear,
    term: team.topic.academicCycle.term,
    teamName: team.name,
    programName: team.topic.program.name,
    programCategory: team.topic.program.category,
    topicTitle: team.topic.title,
    topicDescription: team.topic.description,
    requiredSkills: team.topic.requiredSkills,
    preferredSkills: team.topic.preferredSkills,
    professorName: team.topic.author.name,
    memberNames: team.members.map(({ student }) => student.name),
    artifacts: team.artifacts.map(({ file, ...artifact }) => ({
      id: artifact.id,
      type: artifact.type,
      title: artifact.title,
      fileId: artifact.fileId ?? undefined,
      fileName: file?.originalName,
      externalUrl: artifact.externalUrl ?? undefined,
    })),
  };
}

export class PrismaTeamArchiveRepository implements ArchivedProjectReader, TeamCloser {
  constructor(private readonly client: PrismaClient) {}

  async listAcademicYears(): Promise<number[]> {
    const cycles = await this.client.academicCycle.findMany({
      where: { topics: { some: { team: { is: { status: "CLOSED" } } } } },
      distinct: ["academicYear"],
      orderBy: { academicYear: "desc" },
      select: { academicYear: true },
    });
    return cycles.map(({ academicYear }) => academicYear);
  }

  async listProgramCategories(): Promise<string[]> {
    const programs = await this.client.projectProgram.findMany({
      where: { topics: { some: { team: { is: { status: "CLOSED" } } } } },
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    });
    return programs.map(({ category }) => category);
  }

  close(teamId: string, actor: CurrentActor): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const decidedAt = new Date();
      const teams = await transaction.$queryRaw<Array<{ id: string; topicId: string }>>(Prisma.sql`
        SELECT "team"."id", "team"."topicId"
        FROM "team"
        WHERE "team"."id" = ${teamId}
          AND "team"."status" = 'CONFIRMED'
          AND (
            ${actor.role}::"UserRole" = 'ADMIN'
            OR (
              ${actor.role}::"UserRole" = 'PROFESSOR'
              AND "team"."professorId" = ${actor.id}
            )
          )
        FOR UPDATE
      `);
      const team = teams[0];
      if (!team) return false;

      const approved = await transaction.$queryRaw<Array<{ approved: boolean }>>(Prisma.sql`
        SELECT true AS "approved"
        WHERE EXISTS (
          SELECT 1 FROM "report" WHERE "teamId" = ${teamId}
        )
          AND NOT EXISTS (
            SELECT 1
            FROM "report"
            WHERE "report"."teamId" = ${teamId}
              AND NOT EXISTS (
                SELECT 1
                FROM "report_version"
                JOIN "approval_decision" ON "approval_decision"."reportVersionId" = "report_version"."id"
                WHERE "report_version"."reportId" = "report"."id"
                  AND "report_version"."version" = (
                    SELECT max("latest"."version")
                    FROM "report_version" AS "latest"
                    WHERE "latest"."reportId" = "report"."id"
                  )
                  AND "approval_decision"."decision" = 'APPROVED'
              )
          )
      `);
      if (approved.length !== 1) return false;
      const result = await transaction.team.updateMany({
        where: { id: teamId, status: "CONFIRMED" },
        data: { status: "CLOSED" },
      });
      if (result.count === 1) {
        const applications = await transaction.topicApplication.findMany({
          where: { topicId: team.topicId, status: "PENDING" },
          select: { id: true, studentId: true, topic: { select: { title: true } } },
        });
        await transaction.topic.updateMany({
          where: { id: team.topicId },
          data: { status: "CLOSED" },
        });
        await transaction.topicApplication.updateMany({
          where: { topicId: team.topicId, status: "PENDING" },
          data: { status: "REJECTED", decidedAt },
        });
        await createApplicationResultNotifications(transaction, applications.map((application) => ({
          applicationId: application.id,
          recipientId: application.studentId,
          topicTitle: application.topic.title,
          outcome: "REJECTED",
          createdAt: decidedAt,
        })));
        await transaction.auditLog.create({ data: {
          actorId: actor.id,
          action: "TEAM_CLOSED",
          targetType: "TEAM",
          targetId: team.id,
          metadata: { topicId: team.topicId },
          createdAt: decidedAt,
        } });
      }
      return result.count === 1;
    });
  }

  async countClosed(filters: ArchiveFilters): Promise<number> {
    const skillTeamIds = filters.query ? await this.findSkillMatchingTeamIds(filters.query) : undefined;
    return this.client.team.count({ where: closedProjectWhere(filters, skillTeamIds) });
  }

  async listClosed(input: { offset: number; limit: number; filters: ArchiveFilters }): Promise<ArchivedProject[]> {
    const skillTeamIds = input.filters.query ? await this.findSkillMatchingTeamIds(input.filters.query) : undefined;
    const teams = await this.client.team.findMany({
      where: closedProjectWhere(input.filters, skillTeamIds),
      orderBy: [
        { topic: { academicCycle: { academicYear: "desc" } } },
        { topic: { academicCycle: { term: "desc" } } },
        { name: "asc" },
        { id: "asc" },
      ],
      skip: input.offset,
      take: input.limit,
      select: archivedProjectSelect,
    });
    return teams.map(toArchivedProject);
  }

  async findClosed(id: string): Promise<ArchivedProject | null> {
    const team = await this.client.team.findFirst({
      where: { id, status: "CLOSED" },
      select: archivedProjectSelect,
    });
    return team ? toArchivedProject(team) : null;
  }

  private async findSkillMatchingTeamIds(query: string): Promise<string[]> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT DISTINCT "team"."id"
      FROM "team"
      JOIN "topic" ON "topic"."id" = "team"."topicId"
      CROSS JOIN LATERAL unnest("topic"."requiredSkills" || "topic"."preferredSkills") AS "skill"("value")
      WHERE "team"."status" = 'CLOSED'
        AND strpos(lower("skill"."value"), lower(${query})) > 0
    `);
    return rows.map(({ id }) => id);
  }
}

function closedProjectWhere(filters: ArchiveFilters, skillTeamIds?: string[]): Prisma.TeamWhereInput {
  const conditions: Prisma.TeamWhereInput[] = [];
  if (filters.academicYear) conditions.push({ topic: { academicCycle: { academicYear: filters.academicYear } } });
  if (filters.programCategory) conditions.push({ topic: { program: { category: filters.programCategory } } });
  if (filters.query) {
    const query = filters.query;
    conditions.push({ OR: [
      { name: { contains: query, mode: "insensitive" } },
      { topic: { author: { name: { contains: query, mode: "insensitive" } } } },
      { topic: { title: { contains: query, mode: "insensitive" } } },
      { topic: { description: { contains: query, mode: "insensitive" } } },
      { id: { in: skillTeamIds ?? [] } },
      { artifacts: { some: { title: { contains: query, mode: "insensitive" } } } },
    ] });
  }
  return { status: "CLOSED", AND: conditions };
}
