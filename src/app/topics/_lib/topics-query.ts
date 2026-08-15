import type {
  AdminProjectReportFilter,
  AdminProjectTeamFilter,
} from "@/modules/team/application/list-admin-program-project-operations";

export type ProjectView = "active" | "past";

export type TopicsHrefInput = {
  view?: ProjectView;
  programId?: string;
  q?: string;
  divisionId?: string | "UNASSIGNED";
  teamStatus?: AdminProjectTeamFilter;
  reportStatus?: AdminProjectReportFilter;
  page?: number;
};

export function topicsHref(input: TopicsHrefInput) {
  const params = new URLSearchParams();
  if (input.view === "past") params.set("view", "past");
  if (input.programId) params.set("programId", input.programId);
  if (input.divisionId) params.set("divisionId", input.divisionId);
  if (input.q) params.set("q", input.q);
  if (input.teamStatus && input.teamStatus !== "all") params.set("teamStatus", input.teamStatus);
  if (input.reportStatus && input.reportStatus !== "all") params.set("reportStatus", input.reportStatus);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const search = params.toString();
  return search ? `/topics?${search}` : "/topics";
}

export function hasTopicsFilters(input: Pick<TopicsHrefInput, "q" | "divisionId" | "teamStatus" | "reportStatus">) {
  return Boolean(
    input.q
    || input.divisionId
    || input.teamStatus && input.teamStatus !== "all"
    || input.reportStatus && input.reportStatus !== "all",
  );
}
