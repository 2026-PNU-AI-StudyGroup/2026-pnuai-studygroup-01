import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { isReportSubmissionOverdue } from "@/modules/team/domain/project-progress";

export const adminProjectOperationFilters = [
  "all",
  "operating",
  "unassigned",
  "overdue",
  "submitted",
] as const;

export type AdminProjectOperationFilter = typeof adminProjectOperationFilters[number];

export function parseAdminProjectOperationFilter(value: string | undefined): AdminProjectOperationFilter {
  return adminProjectOperationFilters.includes(value as AdminProjectOperationFilter)
    ? value as AdminProjectOperationFilter
    : "all";
}

export type AdminProgramProjectOperationRecord = {
  topicId: string;
  team: null | {
    reports: Array<{ dueAt: Date; submitted: boolean }>;
  };
};

export type AdminProgramProjectOperations = {
  summary: {
    total: number;
    operating: number;
    unassigned: number;
    overdue: number;
    submitted: number;
  };
  matchingTopicIds: string[];
};

export interface AdminProgramProjectOperationsReader {
  listByProgram(programId: string): Promise<AdminProgramProjectOperationRecord[]>;
}

export class AdminProgramProjectOperationsForbiddenError extends Error {}

export class ListAdminProgramProjectOperationsService {
  constructor(
    private readonly reader: AdminProgramProjectOperationsReader,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    actor: CurrentActor,
    programId: string,
    selectedFilter: AdminProjectOperationFilter,
  ): Promise<AdminProgramProjectOperations> {
    if (actor.role !== "ADMIN") {
      throw new AdminProgramProjectOperationsForbiddenError(
        "관리자만 프로그램 운영 요약을 확인할 수 있습니다.",
      );
    }

    const now = this.now();
    const projects = (await this.reader.listByProgram(programId)).map((project) => {
      const reports = project.team?.reports ?? [];
      const operating = project.team !== null;
      const overdue = reports.some((report) =>
        isReportSubmissionOverdue(report.dueAt, report.submitted, now),
      );
      const submitted = reports.length > 0 && reports.every((report) => report.submitted);
      return { ...project, operating, overdue, submitted };
    });

    const matches = (project: typeof projects[number]) => {
      if (selectedFilter === "operating") return project.operating;
      if (selectedFilter === "unassigned") return !project.operating;
      if (selectedFilter === "overdue") return project.overdue;
      if (selectedFilter === "submitted") return project.submitted;
      return true;
    };

    return {
      summary: {
        total: projects.length,
        operating: projects.filter(({ operating }) => operating).length,
        unassigned: projects.filter(({ operating }) => !operating).length,
        overdue: projects.filter(({ overdue }) => overdue).length,
        submitted: projects.filter(({ submitted }) => submitted).length,
      },
      matchingTopicIds: projects.filter(matches).map(({ topicId }) => topicId),
    };
  }
}
