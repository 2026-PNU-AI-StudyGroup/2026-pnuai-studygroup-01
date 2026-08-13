import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import {
  normalizeTeamProjectInfo,
} from "@/modules/team/domain/team-project-info-policy";

export type TeamProjectInfo = {
  teamId: string;
  programName: string;
  title: string;
  description: string;
  status: "FORMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  canEdit: boolean;
};

export type TeamProjectInfoUpdateOutcome =
  | "UPDATED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "NOT_IN_PROGRESS";

export interface TeamProjectInfoRepository {
  findForActor(teamId: string, actor: CurrentActor): Promise<TeamProjectInfo | null>;
  update(
    teamId: string,
    actor: CurrentActor,
    input: { title: string; description: string },
  ): Promise<TeamProjectInfoUpdateOutcome>;
}

export class TeamProjectInfoNotFoundError extends Error {
  constructor() {
    super("프로젝트를 찾을 수 없습니다.");
    this.name = "TeamProjectInfoNotFoundError";
  }
}

export class TeamProjectInfoForbiddenError extends Error {
  constructor() {
    super("프로젝트 정보를 수정할 권한이 없습니다.");
    this.name = "TeamProjectInfoForbiddenError";
  }
}

export class TeamProjectInfoNotInProgressError extends Error {
  constructor() {
    super("진행 중인 프로젝트 정보만 수정할 수 있습니다.");
    this.name = "TeamProjectInfoNotInProgressError";
  }
}

export class TeamProjectInfoService {
  constructor(private readonly repository: TeamProjectInfoRepository) {}

  async getForEdit(actor: CurrentActor, teamId: string): Promise<TeamProjectInfo> {
    const project = await this.repository.findForActor(teamId, actor);
    if (!project) throw new TeamProjectInfoNotFoundError();
    if (project.status !== "IN_PROGRESS") throw new TeamProjectInfoNotInProgressError();
    if (!project.canEdit) throw new TeamProjectInfoForbiddenError();
    return project;
  }

  async update(
    actor: CurrentActor,
    teamId: string,
    input: { title: string; description: string },
  ): Promise<void> {
    const normalized = normalizeTeamProjectInfo(input);
    const outcome = await this.repository.update(teamId, actor, normalized);
    if (outcome === "UPDATED") return;
    if (outcome === "NOT_FOUND") throw new TeamProjectInfoNotFoundError();
    if (outcome === "FORBIDDEN") throw new TeamProjectInfoForbiddenError();
    throw new TeamProjectInfoNotInProgressError();
  }
}
