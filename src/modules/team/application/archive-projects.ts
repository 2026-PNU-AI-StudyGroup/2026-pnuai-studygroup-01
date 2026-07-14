import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type ArchivedProject = {
  id: string;
  academicYear: number;
  term: "FIRST" | "SECOND";
  teamName: string;
  topicTitle: string;
  topicDescription: string;
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

export interface ArchivedProjectReader {
  countClosed(): Promise<number>;
  listClosed(input: { offset: number; limit: number }): Promise<ArchivedProject[]>;
}

export interface TeamCloser {
  close(teamId: string, actor: CurrentActor): Promise<boolean>;
}

export class TeamCloseNotAllowedError extends Error {
  constructor() {
    super("최신 결과 보고서가 승인된 확정 팀만 종료할 수 있습니다.");
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

  async execute(page = 1, pageSize = 20) {
    const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0
      ? Math.min(pageSize, 50)
      : 20;
    const total = await this.reader.countClosed();
    const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
    const requestedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
    const normalizedPage = Math.min(requestedPage, totalPages);
    const projects = await this.reader.listClosed({
      offset: (normalizedPage - 1) * normalizedPageSize,
      limit: normalizedPageSize,
    });
    return {
      projects,
      total,
      page: normalizedPage,
      totalPages,
    };
  }
}
