import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class TeamConfirmationNotAllowedError extends Error {
  constructor() {
    super("지도교수 또는 관리자만 구성 중인 팀을 확정할 수 있습니다.");
    this.name = "TeamConfirmationNotAllowedError";
  }
}

export interface TeamConfirmationWriter {
  confirm(teamId: string, actor: CurrentActor): Promise<boolean>;
}

export class ConfirmTeamService {
  constructor(private readonly writer: TeamConfirmationWriter) {}

  async confirm(actor: CurrentActor, teamId: string) {
    if (actor.role === "STUDENT" || !(await this.writer.confirm(teamId, actor))) {
      throw new TeamConfirmationNotAllowedError();
    }
  }
}
