import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type {
  ArchivedProject,
  ArchivedProjectReader,
  ArchiveFilters,
} from "@/modules/team/application/archive-projects";
import { getProgramStartYear } from "@/modules/project-program/domain/project-program-policy";

const archivedProjectSelect = {
  id: true,
  name: true,
  sourceUrl: true,
  thumbnailPath: true,
  posterPath: true,
  topic: { select: {
    title: true,
    description: true,
    advisorRole: true,
    requiredSkills: true,
    preferredSkills: true,
    program: { select: { id: true, name: true, category: true, advisorEnabled: true, startsAt: true } },
    manager: { select: { name: true } },
  } },
  members: {
    orderBy: { joinedAt: "asc" as const },
    select: { student: { select: { name: true } } },
  },
  artifacts: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      type: true,
      title: true,
      fileId: true,
      externalUrl: true,
      file: { select: { originalName: true } },
    },
  },
} satisfies Prisma.TeamSelect;

type ArchivedProjectRow = Prisma.TeamGetPayload<{
  select: typeof archivedProjectSelect;
}>;

export class PrismaTeamArchiveQueryRepository
  implements ArchivedProjectReader
{
  constructor(private readonly client: PrismaClient) {}

  async listProgramCategories(): Promise<string[]> {
    const programs = await this.client.projectProgram.findMany({
      where: { topics: { some: { team: { is: { status: "CLOSED" } } } } },
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    });
    return programs.map(({ category }) => category);
  }

  async listPrograms() {
    const programs = await this.client.projectProgram.findMany({
      where: { topics: { some: { team: { is: { status: "CLOSED" } } } } },
      orderBy: [
        { startsAt: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        category: true,
        startsAt: true,
      },
    });
    return programs.map(({ startsAt, ...program }) => ({
      ...program,
      startYear: getProgramStartYear(startsAt),
    }));
  }

  async countClosed(filters: ArchiveFilters): Promise<number> {
    const skillTeamIds = filters.query
      ? await this.findSkillMatchingTeamIds(filters.query)
      : undefined;
    return this.client.team.count({
      where: closedProjectWhere(filters, skillTeamIds),
    });
  }

  async listClosed(input: {
    offset: number;
    limit: number;
    filters: ArchiveFilters;
  }): Promise<ArchivedProject[]> {
    const skillTeamIds = input.filters.query
      ? await this.findSkillMatchingTeamIds(input.filters.query)
      : undefined;
    const teams = await this.client.team.findMany({
      where: closedProjectWhere(input.filters, skillTeamIds),
      orderBy: [
        { topic: { program: { startsAt: "desc" } } },
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

function toArchivedProject(team: ArchivedProjectRow): ArchivedProject {
  return {
    id: team.id,
    startYear: getProgramStartYear(team.topic.program.startsAt),
    teamName: team.name,
    programId: team.topic.program.id,
    programName: team.topic.program.name,
    programCategory: team.topic.program.category,
    topicTitle: team.topic.title,
    topicDescription: team.topic.description,
    requiredSkills: team.topic.requiredSkills,
    preferredSkills: team.topic.preferredSkills,
    professorName: team.topic.manager!.name,
    advisorRole: team.topic.advisorRole,
    advisorEnabled: team.topic.program.advisorEnabled,
    memberNames: team.members.map(({ student }) => student.name),
    sourceUrl: team.sourceUrl ?? undefined,
    thumbnailPath: team.thumbnailPath ?? undefined,
    posterPath: team.posterPath ?? undefined,
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

function closedProjectWhere(
  filters: ArchiveFilters,
  skillTeamIds?: string[],
): Prisma.TeamWhereInput {
  const conditions: Prisma.TeamWhereInput[] = [];
  if (filters.programId) {
    conditions.push({ topic: { programId: filters.programId } });
  }
  if (filters.programCategory) {
    conditions.push({
      topic: { program: { category: filters.programCategory } },
    });
  }
  if (filters.query) {
    const query = filters.query;
    conditions.push({ OR: [
      { name: { contains: query, mode: "insensitive" } },
      {
        topic: {
          author: { name: { contains: query, mode: "insensitive" } },
          program: { advisorEnabled: true },
        },
      },
      { topic: { title: { contains: query, mode: "insensitive" } } },
      { topic: { description: { contains: query, mode: "insensitive" } } },
      { id: { in: skillTeamIds ?? [] } },
      { artifacts: { some: { title: { contains: query, mode: "insensitive" } } } },
    ] });
  }
  return { status: "CLOSED", AND: conditions };
}
