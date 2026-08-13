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
  project: { select: {
    id: true,
    title: true,
    description: true,
    advisorRole: true,
    requiredSkills: true,
    preferredSkills: true,
    sourceUrl: true,
    thumbnailPath: true,
    posterPath: true,
    divisionId: true,
    division: { select: { name: true } },
    program: { select: { id: true, name: true, category: true, advisorEnabled: true, startsAt: true } },
    manager: { select: { name: true } },
  } },
  memberships: {
    where: { endedAt: null },
    orderBy: { joinedAt: "asc" as const },
    select: { user: { select: { name: true } } },
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
} satisfies Prisma.ProjectTeamSelect;

type ArchivedProjectRow = Prisma.ProjectTeamGetPayload<{
  select: typeof archivedProjectSelect;
}>;

export class PrismaTeamArchiveQueryRepository
  implements ArchivedProjectReader
{
  constructor(
    private readonly client: PrismaClient,
    private readonly audience: "STUDENT" | "FACULTY" | "ADMIN" = "STUDENT",
  ) {}

  async listProgramCategories(): Promise<string[]> {
    const programs = await this.client.projectProgram.findMany({
      where: {
        ...programVisibilityWhere(this.audience),
        endsAt: { lte: new Date() },
        topics: { some: { projectTeam: { confirmedAt: { not: null } } } },
      },
      distinct: ["category"],
      orderBy: { category: "asc" },
      select: { category: true },
    });
    return programs.map(({ category }) => category);
  }

  async listPrograms() {
    const programs = await this.client.projectProgram.findMany({
      where: {
        ...programVisibilityWhere(this.audience),
        endsAt: { lte: new Date() },
        topics: { some: { projectTeam: { confirmedAt: { not: null } } } },
      },
      orderBy: [
        { startsAt: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        category: true,
        icon: true,
        startsAt: true,
        endsAt: true,
        projectRegistrationStartsAt: true,
        projectRegistrationEndsAt: true,
        votingPolicy: { select: { startsAt: true, endsAt: true } },
        divisions: { orderBy: { position: "asc" }, select: { id: true, name: true } },
      },
    });
    return programs.map((program) => ({
      ...program,
      startYear: getProgramStartYear(program.startsAt),
    }));
  }

  async countClosed(filters: ArchiveFilters): Promise<number> {
    const skillTeamIds = filters.query
      ? await this.findSkillMatchingTeamIds(filters.query)
      : undefined;
    return this.client.projectTeam.count({
      where: closedProjectWhere(filters, skillTeamIds, this.audience),
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
    const teams = await this.client.projectTeam.findMany({
      where: closedProjectWhere(input.filters, skillTeamIds, this.audience),
      orderBy: [
        { project: { program: { startsAt: "desc" } } },
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
    const team = await this.client.projectTeam.findFirst({
      where: {
        projectId: id,
        confirmedAt: { not: null },
        project: { program: { ...programVisibilityWhere(this.audience), endsAt: { lte: new Date() } } },
      },
      select: archivedProjectSelect,
    });
    return team ? toArchivedProject(team) : null;
  }

  private async findSkillMatchingTeamIds(query: string): Promise<string[]> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT DISTINCT "project_team"."id"
      FROM "project_team"
      JOIN "topic" ON "topic"."id" = "project_team"."projectId"
      CROSS JOIN LATERAL unnest("topic"."requiredSkills" || "topic"."preferredSkills") AS "skill"("value")
      JOIN "project_program" ON "project_program"."id" = "topic"."programId"
      WHERE "project_team"."confirmedAt" IS NOT NULL
        AND "project_program"."endsAt" <= NOW()
        AND strpos(lower("skill"."value"), lower(${query})) > 0
    `);
    return rows.map(({ id }) => id);
  }
}

function toArchivedProject(team: ArchivedProjectRow): ArchivedProject {
  return {
    id: team.project.id,
    topicId: team.project.id,
    startYear: getProgramStartYear(team.project.program.startsAt),
    teamName: team.name,
    programId: team.project.program.id,
    programName: team.project.program.name,
    programCategory: team.project.program.category,
    divisionId: team.project.divisionId,
    divisionName: team.project.division?.name ?? null,
    topicTitle: team.project.title,
    topicDescription: team.project.description,
    requiredSkills: team.project.requiredSkills,
    preferredSkills: team.project.preferredSkills,
    professorName: team.project.manager!.name,
    advisorRole: team.project.advisorRole,
    advisorEnabled: team.project.program.advisorEnabled,
    memberNames: team.memberships.map(({ user }) => user.name),
    sourceUrl: team.project.sourceUrl ?? undefined,
    thumbnailPath: team.project.thumbnailPath ?? undefined,
    posterPath: team.project.posterPath ?? undefined,
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
  audience: "STUDENT" | "FACULTY" | "ADMIN" = "STUDENT",
): Prisma.ProjectTeamWhereInput {
  const conditions: Prisma.ProjectTeamWhereInput[] = [];
  if (filters.programId) {
    conditions.push({ project: { programId: filters.programId } });
  }
  if (filters.programCategory) {
    conditions.push({
      project: { program: { category: filters.programCategory } },
    });
  }
  if (filters.divisionId === "UNASSIGNED") {
    conditions.push({ project: { divisionId: null } });
  } else if (filters.divisionId) {
    conditions.push({ project: { divisionId: filters.divisionId } });
  }
  if (filters.query) {
    const query = filters.query;
    conditions.push({ OR: [
      { name: { contains: query, mode: "insensitive" } },
      {
        project: {
          author: { name: { contains: query, mode: "insensitive" } },
          program: { advisorEnabled: true },
        },
      },
      { project: { title: { contains: query, mode: "insensitive" } } },
      { project: { description: { contains: query, mode: "insensitive" } } },
      { id: { in: skillTeamIds ?? [] } },
      { artifacts: { some: { title: { contains: query, mode: "insensitive" } } } },
    ] });
  }
  return {
    confirmedAt: { not: null },
    project: { program: { ...programVisibilityWhere(audience), endsAt: { lte: new Date() } } },
    AND: conditions,
  };
}

function programVisibilityWhere(audience: "STUDENT" | "FACULTY" | "ADMIN") {
  if (audience === "ADMIN") return {};
  return audience === "FACULTY" ? { isFacultyPublic: true } : { isStudentPublic: true };
}
