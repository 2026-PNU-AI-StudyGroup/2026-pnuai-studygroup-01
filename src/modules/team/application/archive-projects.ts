import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type ArchivedProject = {
  id: string;
  academicYear: number;
  term: "FIRST" | "SECOND";
  teamName: string;
  programName: string;
  programCategory: string;
  topicTitle: string;
  topicDescription: string;
  requiredSkills: string[];
  preferredSkills: string[];
  professorName: string;
  memberNames: string[];
  artifacts: Array<{
    id: string;
    type: "PRESENTATION_VIDEO" | "SOURCE_CODE" | "POSTER" | "OTHER";
    title: string;
    fileId?: string;
    fileName?: string;
    externalUrl?: string;
  }>;
};

export type ArchiveFilters = {
  query?: string;
  academicYear?: number;
  programCategory?: string;
};

export interface ArchivedProjectReader {
  listAcademicYears(): Promise<number[]>;
  listProgramCategories(): Promise<string[]>;
  countClosed(filters: ArchiveFilters): Promise<number>;
  listClosed(input: { offset: number; limit: number; filters: ArchiveFilters }): Promise<ArchivedProject[]>;
}

export interface TeamCloser {
  close(teamId: string, actor: CurrentActor): Promise<boolean>;
}

export class TeamCloseNotAllowedError extends Error {
  constructor() {
    super("설정된 모든 보고서의 최신 버전이 승인된 확정 팀만 종료할 수 있습니다.");
    this.name = "TeamCloseNotAllowedError";
  }
}

export class CloseTeamService {
  constructor(private readonly closer: TeamCloser) {}

  async close(actor: CurrentActor, teamId: string): Promise<void> {
    if (actor.role === "STUDENT" || !(await this.closer.close(teamId, actor))) {
      throw new TeamCloseNotAllowedError();
    }
  }
}

export class ListArchivedProjectsService {
  constructor(private readonly reader: ArchivedProjectReader) {}

  async execute(page = 1, pageSize = 20, filters: ArchiveFilters = {}) {
    const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0
      ? Math.min(pageSize, 50)
      : 20;
    const normalizedFilters: ArchiveFilters = {
      query: filters.query?.trim().slice(0, 100) || undefined,
      academicYear: Number.isInteger(filters.academicYear) && (filters.academicYear ?? 0) >= 2000 && (filters.academicYear ?? 0) <= 9999
        ? filters.academicYear
        : undefined,
      programCategory: filters.programCategory?.trim().slice(0, 100) || undefined,
    };
    const [total, academicYears, programCategories] = await Promise.all([
      this.reader.countClosed(normalizedFilters),
      this.reader.listAcademicYears(),
      this.reader.listProgramCategories(),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
    const requestedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
    const normalizedPage = Math.min(requestedPage, totalPages);
    const projects = await this.reader.listClosed({
      offset: (normalizedPage - 1) * normalizedPageSize,
      limit: normalizedPageSize,
      filters: normalizedFilters,
    });
    return {
      projects,
      total,
      page: normalizedPage,
      totalPages,
      academicYears,
      programCategories,
    };
  }
}
