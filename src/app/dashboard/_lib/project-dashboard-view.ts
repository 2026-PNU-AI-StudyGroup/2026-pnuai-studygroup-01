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
