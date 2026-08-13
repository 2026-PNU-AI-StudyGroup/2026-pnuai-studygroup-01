import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export class TeamConfirmationNotAllowedError extends Error {
  constructor() {
    super("팀을 확정할 권한이 없습니다.");
    this.name = "TeamConfirmationNotAllowedError";
  }
}

export interface TeamConfirmationWriter {
  confirm(teamId: string, actor: CurrentActor): Promise<boolean>;
}

export class ConfirmTeamService {
  constructor(private readonly writer: TeamConfirmationWriter) {}

  async confirm(actor: CurrentActor, teamId: string) {
    if (!(await this.writer.confirm(teamId, actor))) {
      throw new TeamConfirmationNotAllowedError();
    }
  }
}
