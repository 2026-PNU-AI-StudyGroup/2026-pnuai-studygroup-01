export const adminProjectProgressFilters = [
  "all",
  "overdue",
  "unscheduled",
  "not-started",
  "early",
  "middle",
  "late",
  "finalizing",
  "completed",
] as const;

export type AdminProjectProgressFilter = typeof adminProjectProgressFilters[number];

export function parseAdminProjectProgressFilter(
  value: string | undefined,
): AdminProjectProgressFilter {
  return adminProjectProgressFilters.includes(value as AdminProjectProgressFilter)
    ? value as AdminProjectProgressFilter
    : "all";
}

export function parseAdminProjectPage(value: string | undefined): number {
  const parsed = Number(value ?? "1");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}
