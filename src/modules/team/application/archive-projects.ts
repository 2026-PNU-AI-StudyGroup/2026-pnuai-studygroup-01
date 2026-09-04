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
  professorName: string;
  advisorRole: string;
  advisorEnabled: boolean;
  memberNames: string[];
  sourceUrl?: string;
  thumbnailPath?: string;
  posterPath?: string;
  showcaseIntro?: string;
  award?: string;
  /**
   * 인기상은 심사가 아니라 표로 정해진다. 그래서 수상 내역에 적어 두지 않고 득표에서 뽑는다.
   * 투표가 끝나고 결과를 공개하는 프로그램에서만 참이 된다.
   */
  popularAward?: boolean;
  // 관리자에게만 채워 준다. 학생·교원은 정확한 득표수를 보지 않는다.
  archivedVoteCount?: number;
  artifacts: Array<{
    id: string;
    type: "PRESENTATION_VIDEO" | "SOURCE_CODE" | "POSTER" | "OTHER" | "IMAGE";
    title: string;
    fileId?: string;
    fileName?: string;
    externalUrl?: string;
    position: number;
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

/**
 * 지난 프로젝트 한 쪽에 담는 개수.
 *
 * 18개씩 끊어 3열 카드로 보여 주니 한 대회를 훑는 데 쪽을 계속 넘겨야 했다.
 * 한 대회가 대개 20~50팀이라 이 크기면 대부분 한 쪽에 들어온다.
 */
export const ARCHIVE_LIST_PAGE_SIZE = 50;

export class ListArchivedProjectsService {
  constructor(private readonly reader: ArchivedProjectReader) {}

  listPrograms(): Promise<ArchivedProgramOption[]> {
    return this.reader.listPrograms();
  }

  async execute(page = 1, pageSize = ARCHIVE_LIST_PAGE_SIZE, filters: ArchiveFilters = {}) {
    const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0
      ? Math.min(pageSize, ARCHIVE_LIST_PAGE_SIZE)
      : ARCHIVE_LIST_PAGE_SIZE;
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
