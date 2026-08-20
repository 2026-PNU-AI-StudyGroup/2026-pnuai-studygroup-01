import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";

type TeamStatusPresentation = {
  label: string;
  tone: "warning" | "info" | "neutral" | "success" | "danger";
};

export const teamStatusPresentation = {
  FORMING: { label: "구성 중", tone: "warning" },
  IN_PROGRESS: { label: "진행 중", tone: "info" },
  // 진행 중(파랑)과 눈에 띄게 달라야 목록에서 한눈에 갈린다. 예전에는 둘 다 옅은 회색계열이었다.
  COMPLETED: { label: "완료", tone: "success" },
  CANCELED: { label: "취소", tone: "danger" },
} as const satisfies Record<TeamListItem["status"], TeamStatusPresentation>;
