import type { TeamActionState } from "@/app/projects/[projectId]/_actions/team-workspace-actions";

export const initialTeamActionState: TeamActionState = {
  status: "idle",
  message: "",
};
