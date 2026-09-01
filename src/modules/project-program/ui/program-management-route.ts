export const programManagementTabs = [
  "settings",
  "operation",
  "schedule",
  "votes",
  "rubric",
  "results",
  "reports",
  "advisors",
] as const;

export type ProgramManagementTab = typeof programManagementTabs[number];

export function parseProgramManagementTab(value: string | undefined): ProgramManagementTab {
  return programManagementTabs.includes(value as ProgramManagementTab)
    ? value as ProgramManagementTab
    : "settings";
}

export function resolveProgramManagementTab(value: string | undefined): {
  tab: ProgramManagementTab;
  legacy: "tracks" | null;
} {
  if (value === "tracks") return { tab: "settings", legacy: "tracks" };
  return { tab: parseProgramManagementTab(value), legacy: null };
}

export function programManagementHref(
  programId: string,
  tab: ProgramManagementTab = "settings",
) {
  const base = `/topics/manage/${encodeURIComponent(programId)}`;
  return tab === "settings" ? base : `${base}/${tab}`;
}

export function programCreateHref() {
  return "/topics/manage/new";
}
