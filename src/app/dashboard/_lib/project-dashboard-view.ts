import type { SearchParamValue } from "@/shared/ui/search-param";

export type ProjectDashboardView =
  | "all"
  | "pending"
  | "rejected"
  | "active"
  | "completed";

export function parseProjectDashboardView(
  value: SearchParamValue,
): ProjectDashboardView {
  return value === "pending" ||
    value === "rejected" ||
    value === "active" ||
    value === "completed"
    ? value
    : "all";
}

export type ProjectDashboardCounts = {
  all: number;
  pending: number;
  rejected: number;
  active: number;
  completed: number;
};

export function buildProjectDashboardCounts(input: {
  pending: number;
  rejected: number;
  active: number;
  completed: number;
}): ProjectDashboardCounts {
  return {
    all: input.pending + input.rejected + input.active + input.completed,
    ...input,
  };
}

export type DashboardDeadline = {
  key: string;
  kind: "REPORT" | "TASK";
  title: string;
  dueAt: Date;
  projectId: string;
  projectTitle: string;
  programName: string;
  assignees: string[];
};

/**
 * 여러 프로젝트의 마감을 한 줄로 모은다. 아직 안 낸 필수 보고서와 끝나지 않은 할 일을 날짜순으로 둔다.
 * 지난 마감도 버리지 않는다. 날짜가 가장 이르니 맨 앞에 와서 먼저 눈에 띈다.
 */
export function collectDashboardDeadlines(
  teams: Array<{
    id: string;
    topicTitle: string;
    programName: string;
    status: string;
    tasks: Array<{ id: string; title: string; dueAt: Date; status: string; assignees: Array<{ name: string }> }>;
  }>,
  openReports: Array<{ id: string; projectId: string; title: string; dueAt: Date }>,
): DashboardDeadline[] {
  const live = new Map(teams.filter(({ status }) => status === "IN_PROGRESS").map((team) => [team.id, team]));
  const tasks = [...live.values()].flatMap((team) => team.tasks
    .filter(({ status }) => status !== "DONE")
    .map((task): DashboardDeadline => ({
      key: `task-${task.id}`,
      kind: "TASK",
      title: task.title,
      dueAt: task.dueAt,
      projectId: team.id,
      projectTitle: team.topicTitle,
      programName: team.programName,
      assignees: task.assignees.map(({ name }) => name),
    })));
  const reports = openReports.flatMap((report): DashboardDeadline[] => {
    const team = live.get(report.projectId);
    return team ? [{
      key: `report-${report.id}`,
      kind: "REPORT",
      title: report.title,
      dueAt: report.dueAt,
      projectId: team.id,
      projectTitle: team.topicTitle,
      programName: team.programName,
      assignees: [],
    }] : [];
  });
  return [...reports, ...tasks].sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime() || left.key.localeCompare(right.key));
}
