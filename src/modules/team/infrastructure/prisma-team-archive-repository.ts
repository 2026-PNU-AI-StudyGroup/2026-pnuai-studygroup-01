import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type {
  ArchivedProject,
  ArchiveFilters,
  ArchivedProjectReader,
  TeamCloser,
} from "@/modules/team/application/archive-projects";

export class PrismaTeamArchiveRepository implements ArchivedProjectReader, TeamCloser {
  constructor(private readonly client: PrismaClient) {}

  close(teamId: string, actor: CurrentActor): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
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

      const approved = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "report_version"."id"
        FROM "report"
        JOIN "report_version" ON "report_version"."reportId" = "report"."id"
        JOIN "approval_decision" ON "approval_decision"."reportVersionId" = "report_version"."id"
        WHERE "report"."teamId" = ${teamId}
          AND "report"."type" = 'FINAL'
          AND "report_version"."version" = (
            SELECT max("latest"."version")
            FROM "report_version" AS "latest"
            WHERE "latest"."reportId" = "report"."id"
          )
          AND "approval_decision"."decision" = 'APPROVED'
      `);
      if (approved.length !== 1) return false;
      const result = await transaction.team.updateMany({
        where: { id: teamId, status: "CONFIRMED" },
        data: { status: "CLOSED" },
      });
      if (result.count === 1) {
        await transaction.topic.updateMany({
          where: { id: team.topicId },
          data: { status: "CLOSED" },
        });
        await transaction.topicApplication.updateMany({
          where: { topicId: team.topicId, status: "PENDING" },
          data: { status: "REJECTED", decidedAt: new Date() },
        });
      }
      return result.count === 1;
    });
  }

  async countClosed(filters: ArchiveFilters): Promise<number> {
    return this.client.team.count({ where: closedProjectWhere(filters) });
  }

  async listClosed(input: { offset: number; limit: number; filters: ArchiveFilters }): Promise<ArchivedProject[]> {
    const teams = await this.client.team.findMany({
      where: closedProjectWhere(input.filters),
      orderBy: [
        { topic: { academicCycle: { academicYear: "desc" } } },
        { topic: { academicCycle: { term: "desc" } } },
        { name: "asc" },
        { id: "asc" },
      ],
      skip: input.offset,
      take: input.limit,
      select: {
        id: true,
        name: true,
        topic: {
          select: {
            title: true,
            description: true,
            author: { select: { name: true } },
            academicCycle: { select: { academicYear: true, term: true } },
          },
        },
        members: {
          orderBy: { joinedAt: "asc" },
          select: { student: { select: { name: true } } },
        },
        artifacts: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            type: true,
            title: true,
            fileId: true,
            externalUrl: true,
            file: { select: { originalName: true } },
          },
        },
      },
    });
    const projects = teams.map((team) => ({
      id: team.id,
      academicYear: team.topic.academicCycle.academicYear,
      term: team.topic.academicCycle.term,
      teamName: team.name,
      topicTitle: team.topic.title,
      topicDescription: team.topic.description,
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
    }));
    return projects;
  }
}

function closedProjectWhere(filters: ArchiveFilters): Prisma.TeamWhereInput {
  const conditions: Prisma.TeamWhereInput[] = [];
  if (filters.academicYear) conditions.push({ topic: { academicCycle: { academicYear: filters.academicYear } } });
  if (filters.query) {
    const query = filters.query;
    conditions.push({ OR: [
      { name: { contains: query, mode: "insensitive" } },
      { topic: { author: { name: { contains: query, mode: "insensitive" } } } },
      { topic: { title: { contains: query, mode: "insensitive" } } },
      { topic: { description: { contains: query, mode: "insensitive" } } },
      { topic: { requiredSkills: { has: query } } },
      { topic: { preferredSkills: { has: query } } },
      { artifacts: { some: { title: { contains: query, mode: "insensitive" } } } },
    ] });
  }
  return { status: "CLOSED", AND: conditions };
}
