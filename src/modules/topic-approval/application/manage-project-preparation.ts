import type { CurrentUser } from "@/modules/identity/domain/current-actor";
import { normalizeTeamProjectInfo } from "@/modules/team/domain/team-project-info-policy";

export type ProjectPreparationUpdateOutcome = "UPDATED" | "NOT_FOUND" | "FORBIDDEN" | "UNAVAILABLE";

export interface ProjectPreparationRepository {
  updatePreparation(input: {
    actor: CurrentUser;
    projectId: string;
    projectTeamName: string;
    projectRepresentativeId: string;
    title: string;
    description: string;
    updatedAt: Date;
  }): Promise<ProjectPreparationUpdateOutcome>;
}

export class ProjectPreparationOperationError extends Error {}

export class ProjectPreparationService {
  constructor(
    private readonly repository: ProjectPreparationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async update(
    actor: CurrentUser,
    input: {
      projectId: string;
      projectTeamName: string;
      projectRepresentativeId: string;
      title: string;
      description: string;
    },
  ) {
    if (actor.role !== "STUDENT") throw new ProjectPreparationOperationError("학생 등록 프로젝트만 준비 정보를 수정할 수 있습니다.");
    const projectTeamName = input.projectTeamName.trim();
    if (projectTeamName.length < 1 || projectTeamName.length > 100) {
      throw new ProjectPreparationOperationError("프로젝트 팀명은 1자 이상 100자 이하여야 합니다.");
    }
    if (!input.projectRepresentativeId) {
      throw new ProjectPreparationOperationError("프로젝트 대표를 지정해 주세요.");
    }
    const details = normalizeTeamProjectInfo(input);
    const outcome = await this.repository.updatePreparation({
      actor,
      projectId: input.projectId,
      projectTeamName,
      projectRepresentativeId: input.projectRepresentativeId,
      ...details,
      updatedAt: this.now(),
    });
    if (outcome === "UPDATED") return;
    if (outcome === "FORBIDDEN") throw new ProjectPreparationOperationError("프로젝트를 등록한 팀장만 준비 정보를 수정할 수 있습니다.");
    if (outcome === "UNAVAILABLE") throw new ProjectPreparationOperationError("대표자와 팀 구성을 다시 확인해 주세요.");
    throw new ProjectPreparationOperationError("승인 대기 프로젝트를 찾을 수 없습니다.");
  }
}
