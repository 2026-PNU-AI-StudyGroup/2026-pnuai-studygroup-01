import type { AdminProjectOperationFilter } from "@/modules/team/application/list-admin-program-project-operations";

export type ProjectView = "active" | "past";

export type TopicsHrefInput = {
  view?: ProjectView;
  programId?: string;
  q?: string;
  divisionId?: string | "UNASSIGNED";
  operation?: AdminProjectOperationFilter;
  page?: number;
};

export function topicsHref(input: TopicsHrefInput) {
  const params = new URLSearchParams();
  if (input.view === "past") params.set("view", "past");
  if (input.programId) params.set("programId", input.programId);
  if (input.divisionId) params.set("divisionId", input.divisionId);
  if (input.q) params.set("q", input.q);
  if (input.operation && input.operation !== "all") params.set("operation", input.operation);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const search = params.toString();
  return search ? `/topics?${search}` : "/topics";
}

export function hasTopicsFilters(input: Pick<TopicsHrefInput, "q" | "divisionId" | "operation">) {
  return Boolean(input.q || input.divisionId || input.operation && input.operation !== "all");
}
