import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";

type TeamStatusPresentation = {
  label: string;
  tone: "warning" | "info" | "neutral" | "danger";
};

export const teamStatusPresentation = {
  FORMING: { label: "구성 중", tone: "warning" },
  IN_PROGRESS: { label: "진행 중", tone: "info" },
  COMPLETED: { label: "완료", tone: "neutral" },
  CANCELED: { label: "취소", tone: "danger" },
} as const satisfies Record<TeamListItem["status"], TeamStatusPresentation>;
