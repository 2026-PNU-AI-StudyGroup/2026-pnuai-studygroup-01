import type { AdminProjectOperationFilter } from "@/modules/team/application/list-admin-program-project-operations";

export function activeProjectsHref(input: {
  programId?: string;
  divisionId?: string | "UNASSIGNED";
  query?: string;
  page?: number;
  operation?: AdminProjectOperationFilter;
}) {
  const params = new URLSearchParams();
  if (input.programId) params.set("programId", input.programId);
  if (input.divisionId) params.set("divisionId", input.divisionId);
  if (input.query) params.set("q", input.query);
  if (input.operation && input.operation !== "all") params.set("operation", input.operation);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const search = params.toString();
  return search ? `/topics?${search}` : "/topics";
}
