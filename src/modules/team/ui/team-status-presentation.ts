import type { TeamListItem } from "@/modules/team/application/team-workspace-ports";

type TeamStatusPresentation = {
  label: string;
  tone: "warning" | "info" | "neutral";
};

export const teamStatusPresentation = {
  FORMING: { label: "구성 중", tone: "warning" },
  CONFIRMED: { label: "진행 중", tone: "info" },
  CLOSED: { label: "완료", tone: "neutral" },
} as const satisfies Record<TeamListItem["status"], TeamStatusPresentation>;
