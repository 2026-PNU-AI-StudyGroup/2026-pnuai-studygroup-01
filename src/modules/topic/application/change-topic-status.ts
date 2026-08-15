import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { TopicStateRepository } from "@/modules/topic/application/topic-ports";
import { canManageTopic } from "@/modules/topic/domain/topic-policy";

export class TopicNotFoundError extends Error {
  constructor() {
    super("프로젝트를 찾을 수 없습니다.");
    this.name = "TopicNotFoundError";
  }
}

export class TopicManagementForbiddenError extends Error {
  constructor() {
    super("프로젝트 상태를 변경할 권한이 없습니다.");
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
  constructor(private readonly repository: TopicStateRepository, private readonly now: () => Date = () => new Date()) {}

  async closeRecruitment(actor: CurrentActor, topicId: string): Promise<void> {
    const topic = await this.requireManageableTopic(actor, topicId);
    if (
      topic.status !== "ACTIVE" ||
      !topic.recruitmentEnabled ||
      !(actor.role === "ADMIN" || (actor.role === "PROFESSOR" && actor.id === topic.managerId))
    ) {
      throw new InvalidTopicStatusTransitionError("현재 프로젝트 모집을 마감할 수 없습니다.");
    }
    if (!(await this.repository.closeRecruitment(topic.id, actor, this.now()))) {
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
