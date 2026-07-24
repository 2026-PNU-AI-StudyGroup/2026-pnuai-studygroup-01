import type { TeamActionState } from "@/app/teams/[teamId]/_actions/team-workspace-actions";

export const initialTeamActionState: TeamActionState = {
  status: "idle",
  message: "",
};
