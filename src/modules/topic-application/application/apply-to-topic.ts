import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { TopicApplicationCreator } from "@/modules/topic-application/application/topic-application-ports";
import {
  assertCanApplyToTopic,
  normalizeApplicationMessage,
} from "@/modules/topic-application/domain/topic-application-policy";

export class TopicAlreadyAppliedError extends Error {
  constructor() {
    super("이미 지원한 주제입니다.");
    this.name = "TopicAlreadyAppliedError";
  }
}

export class TopicUnavailableForApplicationError extends Error {
  constructor() {
    super("현재 지원할 수 없는 주제입니다.");
    this.name = "TopicUnavailableForApplicationError";
  }
}

export class ApplyToTopicService {
  constructor(
    private readonly repository: TopicApplicationCreator,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(
    actor: CurrentActor,
    input: { topicId: string; message: string },
  ): Promise<{ id: string }> {
    assertCanApplyToTopic(actor);
    const message = normalizeApplicationMessage(input.message);

    const result = await this.repository.createIfAvailable({
      topicId: input.topicId,
      studentId: actor.id,
      message,
      appliedAt: this.now(),
    });

    if (result.outcome === "ALREADY_APPLIED") {
      throw new TopicAlreadyAppliedError();
    }
    if (result.outcome === "TOPIC_UNAVAILABLE") {
      throw new TopicUnavailableForApplicationError();
    }
    return { id: result.id };
  }
}
