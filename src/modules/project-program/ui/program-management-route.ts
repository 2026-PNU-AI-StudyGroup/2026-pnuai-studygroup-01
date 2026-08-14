export const programManagementTabs = [
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
    : "settings";
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
