export const programManagementTabs = [
  "overview",
  "settings",
  "rubric",
  "tracks",
  "reports",
  "votes",
] as const;

export type ProgramManagementTab = typeof programManagementTabs[number];

export function parseProgramManagementTab(value: string | undefined): ProgramManagementTab {
  return programManagementTabs.includes(value as ProgramManagementTab)
    ? value as ProgramManagementTab
    : "overview";
}

export function programManagementHref(
  programId: string,
  tab: ProgramManagementTab = "overview",
  extra: { progress?: string; page?: number } = {},
) {
  const params = new URLSearchParams({ programId, mode: "manage", tab });
  if (extra.progress && extra.progress !== "all") params.set("progress", extra.progress);
  if (extra.page && extra.page > 1) params.set("page", String(extra.page));
  return `/topics?${params.toString()}`;
}

export function programProjectsHref(programId: string) {
  return `/topics?programId=${encodeURIComponent(programId)}`;
}
