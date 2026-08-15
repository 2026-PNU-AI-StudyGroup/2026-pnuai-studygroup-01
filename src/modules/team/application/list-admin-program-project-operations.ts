import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { isReportSubmissionOverdue } from "@/modules/team/domain/project-progress";

export const adminProjectTeamFilters = ["all", "formed", "unassigned"] as const;
export const adminProjectReportFilters = ["all", "overdue", "submitted"] as const;

export type AdminProjectTeamFilter = typeof adminProjectTeamFilters[number];
export type AdminProjectReportFilter = typeof adminProjectReportFilters[number];
export type AdminProjectOperationFilters = {
  team: AdminProjectTeamFilter;
  report: AdminProjectReportFilter;
};

function parseFilter<T extends readonly string[]>(value: string | undefined, allowed: T): T[number] {
  return allowed.includes(value ?? "") ? value as T[number] : "all" as T[number];
}

/** 이전 단일 operation 링크는 읽되, 모든 새 링크는 teamStatus/reportStatus를 사용한다. */
export function parseAdminProjectOperationFilters(input: {
  teamStatus?: string;
  reportStatus?: string;
  operation?: string;
}): AdminProjectOperationFilters {
  const legacy = input.operation === "operating"
    ? { team: "formed", report: "all" }
    : input.operation === "unassigned"
      ? { team: "unassigned", report: "all" }
      : input.operation === "overdue"
        ? { team: "all", report: "overdue" }
        : input.operation === "submitted"
          ? { team: "all", report: "submitted" }
          : { team: "all", report: "all" };

  return {
    team: parseFilter(input.teamStatus ?? legacy.team, adminProjectTeamFilters),
    report: parseFilter(input.reportStatus ?? legacy.report, adminProjectReportFilters),
  };
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
    formed: number;
    unassigned: number;
    overdue: number;
    submitted: number;
  };
  matchingTopicIds: string[];
};

export interface AdminProgramProjectOperationsReader {
  listByProgram(programId: string, divisionId?: string | "UNASSIGNED"): Promise<AdminProgramProjectOperationRecord[]>;
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
    filters: AdminProjectOperationFilters,
    divisionId?: string | "UNASSIGNED",
  ): Promise<AdminProgramProjectOperations> {
    if (actor.role !== "ADMIN") {
      throw new AdminProgramProjectOperationsForbiddenError(
        "관리자만 프로그램 운영 요약을 확인할 수 있습니다.",
      );
    }

    const now = this.now();
    const projects = (await this.reader.listByProgram(programId, divisionId)).map((project) => {
      const reports = project.team?.reports ?? [];
      const operating = project.team !== null;
      const overdue = reports.some((report) =>
        isReportSubmissionOverdue(report.dueAt, report.submitted, now),
      );
      const submitted = reports.length > 0 && reports.every((report) => report.submitted);
      return { ...project, operating, overdue, submitted };
    });

    const matches = (project: typeof projects[number]) => {
      const teamMatches = filters.team === "all"
        || filters.team === "formed" && project.operating
        || filters.team === "unassigned" && !project.operating;
      const reportMatches = filters.report === "all"
        || filters.report === "overdue" && project.overdue
        || filters.report === "submitted" && project.submitted;
      return teamMatches && reportMatches;
    };

    return {
      summary: {
        total: projects.length,
        formed: projects.filter(({ operating }) => operating).length,
        unassigned: projects.filter(({ operating }) => !operating).length,
        overdue: projects.filter(({ overdue }) => overdue).length,
        submitted: projects.filter(({ submitted }) => submitted).length,
      },
      matchingTopicIds: projects.filter(matches).map(({ topicId }) => topicId),
    };
  }
}
