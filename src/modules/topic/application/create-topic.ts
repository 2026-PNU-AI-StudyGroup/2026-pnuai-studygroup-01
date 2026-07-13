import type { AcademicCycleReader } from "@/modules/academic-cycle/application/academic-cycle-ports";
import type {
  TopicCreator,
  TopicDraft,
} from "@/modules/topic/application/topic-ports";
import {
  assertValidTopicDetails,
  assertValidTopicSchedule,
  canCreateTopic,
  type TopicActor,
} from "@/modules/topic/domain/topic-policy";

export class TopicCreationForbiddenError extends Error {
  constructor() {
    super("교수 또는 관리자만 주제를 생성할 수 있습니다.");
    this.name = "TopicCreationForbiddenError";
  }
}

export class AcademicCycleNotFoundError extends Error {
  constructor() {
    super("존재하지 않는 학기입니다.");
    this.name = "AcademicCycleNotFoundError";
  }
}

export class CreateTopicService {
  constructor(
    private readonly topicRepository: TopicCreator,
    private readonly academicCycleRepository: AcademicCycleReader,
  ) {}

  async execute(
    actor: TopicActor,
    input: Omit<TopicDraft, "authorId">,
  ): Promise<{ id: string }> {
    if (!canCreateTopic(actor)) {
      throw new TopicCreationForbiddenError();
    }

    assertValidTopicDetails(input);
    assertValidTopicSchedule(input);

    if (!(await this.academicCycleRepository.exists(input.academicCycleId))) {
      throw new AcademicCycleNotFoundError();
    }

    return this.topicRepository.createDraft({
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      authorId: actor.id,
    });
  }
}
