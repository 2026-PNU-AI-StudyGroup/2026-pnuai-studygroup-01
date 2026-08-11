import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ProgramIconKey } from "@/modules/project-program/domain/program-icon";

export type ArchivedProject = {
  id: string;
  topicId: string;
  startYear: number;
  teamName: string;
  programId: string;
  programName: string;
  programCategory: string;
  divisionId?: string | null;
  divisionName?: string | null;
  topicTitle: string;
  topicDescription: string;
  requiredSkills: string[];
  preferredSkills: string[];
  professorName: string;
  advisorRole: string;
  advisorEnabled: boolean;
  memberNames: string[];
  sourceUrl?: string;
  thumbnailPath?: string;
  posterPath?: string;
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
  programId?: string;
  programCategory?: string;
  divisionId?: string | "UNASSIGNED";
};

export type ArchivedProgramOption = {
  id: string;
  name: string;
  category: string;
  icon: ProgramIconKey;
  startYear: number;
  startsAt: Date;
  endsAt: Date;
  projectRegistrationStartsAt: Date;
  projectRegistrationEndsAt: Date;
  votingPolicy: { startsAt: Date; endsAt: Date } | null;
  divisions?: Array<{ id: string; name: string }>;
};

export interface ArchivedProjectReader {
  listProgramCategories(): Promise<string[]>;
  listPrograms(): Promise<ArchivedProgramOption[]>;
  countClosed(filters: ArchiveFilters): Promise<number>;
  listClosed(input: { offset: number; limit: number; filters: ArchiveFilters }): Promise<ArchivedProject[]>;
  findClosed(id: string): Promise<ArchivedProject | null>;
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
    if (!(await this.closer.close(teamId, actor))) {
      throw new TeamCloseNotAllowedError();
    }
  }
}

export class ListArchivedProjectsService {
  constructor(private readonly reader: ArchivedProjectReader) {}

  listPrograms(): Promise<ArchivedProgramOption[]> {
    return this.reader.listPrograms();
  }

  async execute(page = 1, pageSize = 18, filters: ArchiveFilters = {}) {
    const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0
      ? Math.min(pageSize, 50)
      : 20;
    const normalizedFilters: ArchiveFilters = {
      query: filters.query?.trim().slice(0, 100) || undefined,
      programId: filters.programId?.trim().slice(0, 200) || undefined,
      programCategory: filters.programCategory?.trim().slice(0, 100) || undefined,
      divisionId: filters.divisionId?.trim().slice(0, 200) || undefined,
    };
    const [total, programCategories, programs] = await Promise.all([
      this.reader.countClosed(normalizedFilters),
      this.reader.listProgramCategories(),
      this.reader.listPrograms(),
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
      programCategories,
      programs,
    };
  }

  find(id: string): Promise<ArchivedProject | null> {
    return this.reader.findClosed(id);
  }
}
