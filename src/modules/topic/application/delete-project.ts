import type { CurrentActor } from "@/modules/identity/domain/current-actor";

export type DeleteProjectOutcome = "DELETED" | "NOT_FOUND";

export interface ProjectDeletionWriter {
  findTitle(projectId: string): Promise<string | null>;
  delete(input: {
    projectId: string;
    actorId: string;
    reason: string;
    deletedAt: Date;
  }): Promise<DeleteProjectOutcome>;
}

export class DeleteProjectError extends Error {}

/**
 * 프로젝트를 되돌릴 수 없게 지운다. 팀·팀원·할 일·대화·보고서·결과물이 함께 사라진다.
 * 그래서 관리자만 할 수 있고, 프로젝트명을 정확히 입력해야 진행한다.
 * 무엇을 왜 지웠는지는 관리 이력에 남으므로 삭제 후에도 추적할 수 있다.
 */
export class DeleteProjectService {
  constructor(
    private readonly writer: ProjectDeletionWriter,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(actor: CurrentActor, input: {
    projectId: string;
    reason: string;
    confirmedTitle: string;
  }): Promise<void> {
    if (actor.role !== "ADMIN") {
      throw new DeleteProjectError("관리자만 프로젝트를 삭제할 수 있습니다.");
    }
    const reason = input.reason.trim();
    if (!reason) throw new DeleteProjectError("삭제 사유를 입력해 주세요.");

    const title = await this.writer.findTitle(input.projectId);
    if (!title) throw new DeleteProjectError("프로젝트를 찾을 수 없습니다.");
    // 실수로 지우는 일을 막는 장치다. 확인 문구 대신 프로젝트명을 직접 입력하게 한다.
    if (input.confirmedTitle.trim() !== title.trim()) {
      throw new DeleteProjectError("프로젝트명이 일치하지 않습니다.");
    }

    const outcome = await this.writer.delete({
      projectId: input.projectId,
      actorId: actor.id,
      reason: reason.slice(0, 1_000),
      deletedAt: this.now(),
    });
    if (outcome !== "DELETED") throw new DeleteProjectError("프로젝트를 찾을 수 없습니다.");
  }
}
