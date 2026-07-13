import type { AcademicCycleReader } from "@/modules/academic-cycle/application/academic-cycle-ports";
import {
  assertValidTopicDetails,
  assertValidTopicSchedule,
  canCreateTopic,
  type TopicActor,
  type TopicDetails,
  type TopicSchedule,
} from "@/modules/topic/domain/topic-policy";

export type TopicDraft = TopicDetails &
  TopicSchedule & {
    academicCycleId: string;
    authorId: string;
  };

export interface TopicRepository {
  createDraft(topic: TopicDraft): Promise<{ id: string }>;
}

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
    private readonly topicRepository: TopicRepository,
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
