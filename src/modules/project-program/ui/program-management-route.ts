export const programManagementTabs = [
  "settings",
  "reports",
  "votes",
  "rubric",
  "results",
  "advisors",
] as const;

export type ProgramManagementTab = typeof programManagementTabs[number];

/** 평가에 묶이는 탭. 위 줄에는 평가 하나로 보이고, 들어가면 아래 줄에서 나뉜다. */
export const programEvaluationTabs = ["votes", "rubric", "results", "advisors"] as const satisfies readonly ProgramManagementTab[];

/**
 * 예전 탭 주소. 운영 설정과 일정은 설정 한 화면으로 합쳤고, 분과는 기본 정보 안으로 들어갔다.
 * 북마크와 알림 메일 속 링크가 계속 열리도록 설정 화면의 해당 칸으로 보낸다.
 */
const legacyTabAnchors = {
  tracks: "divisions",
  operation: "operation",
  schedule: "schedule",
} as const;

export type LegacyProgramManagementTab = keyof typeof legacyTabAnchors;

export function parseProgramManagementTab(value: string | undefined): ProgramManagementTab {
  return programManagementTabs.includes(value as ProgramManagementTab)
    ? value as ProgramManagementTab
    : "settings";
}

export function resolveProgramManagementTab(value: string | undefined): {
  tab: ProgramManagementTab;
  legacy: LegacyProgramManagementTab | null;
} {
  if (value && Object.hasOwn(legacyTabAnchors, value)) return { tab: "settings", legacy: value as LegacyProgramManagementTab };
  return { tab: parseProgramManagementTab(value), legacy: null };
}

export function legacyProgramManagementAnchor(legacy: LegacyProgramManagementTab | null): string {
  return legacy ? `#${legacyTabAnchors[legacy]}` : "";
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
