import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import { isProjectRegistrationOpen } from "@/modules/project-program/domain/project-program-policy";
import type { TopicStateRepository } from "@/modules/topic/application/topic-ports";
import { canManageTopic } from "@/modules/topic/domain/topic-policy";

export class TopicNotFoundError extends Error {
  constructor() {
    super("주제를 찾을 수 없습니다.");
    this.name = "TopicNotFoundError";
  }
}

export class TopicManagementForbiddenError extends Error {
  constructor() {
    super("주제 작성자 또는 관리자만 상태를 변경할 수 있습니다.");
    this.name = "TopicManagementForbiddenError";
  }
}

export class InvalidTopicStatusTransitionError extends Error {
  constructor(message = "현재 상태에서는 요청한 변경을 수행할 수 없습니다.") {
    super(message);
    this.name = "InvalidTopicStatusTransitionError";
  }
}

export class ChangeTopicStatusService {
  private readonly programs: Pick<ProjectProgramRepository, "findOpen"> | undefined;
  private readonly now: () => Date;

  constructor(
    private readonly repository: TopicStateRepository,
    programsOrNow?: Pick<ProjectProgramRepository, "findOpen"> | (() => Date),
    now: () => Date = () => new Date(),
  ) {
    if (typeof programsOrNow === "function") {
      this.now = programsOrNow;
    } else {
      this.programs = programsOrNow;
      this.now = now;
    }
  }

  async publish(actor: CurrentActor, topicId: string): Promise<void> {
    const topic = await this.requireManageableTopic(actor, topicId);
    if (topic.status !== "DRAFT") {
      throw new InvalidTopicStatusTransitionError();
    }

    const publishedAt = this.now();
    if (topic.recruitmentEndsAt.getTime() <= publishedAt.getTime()) {
      throw new InvalidTopicStatusTransitionError(
        "모집 종료 시각이 지난 주제는 공개할 수 없습니다.",
      );
    }
    if (this.programs && topic.programId) {
      const program = await this.programs.findOpen(topic.programId);
      if (!program || !isProjectRegistrationOpen(program, publishedAt)) {
        throw new InvalidTopicStatusTransitionError("현재 프로젝트 등록 기간이 아니어서 공개할 수 없습니다.");
      }
    }

    if (!(await this.repository.publishDraft(topic.id, actor, publishedAt))) {
      throw new InvalidTopicStatusTransitionError();
    }
  }

  async close(actor: CurrentActor, topicId: string): Promise<void> {
    const topic = await this.requireManageableTopic(actor, topicId);
    if (topic.status !== "PUBLISHED") {
      throw new InvalidTopicStatusTransitionError();
    }

    if (!(await this.repository.closePublished(topic.id, actor))) {
      throw new InvalidTopicStatusTransitionError();
    }
  }

  private async requireManageableTopic(actor: CurrentActor, topicId: string) {
    const topic = await this.repository.findState(topicId);
    if (!topic) {
      throw new TopicNotFoundError();
    }
    if (!canManageTopic(actor, topic.managerId, topic.assistantIds)) {
      throw new TopicManagementForbiddenError();
    }
    return topic;
  }
}
