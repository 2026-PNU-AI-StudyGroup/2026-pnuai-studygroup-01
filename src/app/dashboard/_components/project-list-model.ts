import type {
  MilestoneStatus,
  TeamListItem,
} from "@/modules/team/application/team-workspace-ports";

export const projectStatus = {
  FORMING: "구성 중",
  CONFIRMED: "진행 중",
  CLOSED: "완료",
} as const;

export const milestoneLanes: Array<{
  status: MilestoneStatus;
  label: string;
  description: string;
}> = [
  { status: "TODO", label: "예정", description: "아직 시작하지 않은 작업" },
  { status: "IN_PROGRESS", label: "진행", description: "지금 집중하는 작업" },
  { status: "DONE", label: "완료", description: "마무리한 작업" },
];

export const koreanDate = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
});

export function defaultMilestoneId(team: TeamListItem | undefined): string {
  return (
    team?.milestones.find(({ status }) => status === "IN_PROGRESS")?.id ??
    team?.milestones.find(({ status }) => status === "TODO")?.id ??
    team?.milestones[0]?.id ??
    ""
  );
}
