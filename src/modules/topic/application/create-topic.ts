import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import type { ProjectProgramRepository } from "@/modules/project-program/application/manage-project-programs";
import type {
  TopicCreator,
  TopicDraft,
} from "@/modules/topic/application/topic-ports";
import {
  assertValidTopicDetails,
  assertValidTopicSchedule,
  canCreateTopic,
} from "@/modules/topic/domain/topic-policy";

export class TopicCreationForbiddenError extends Error {
  constructor() {
    super("교수 또는 관리자만 주제를 생성할 수 있습니다.");
    this.name = "TopicCreationForbiddenError";
  }
}

export class ProjectProgramNotOpenError extends Error {
  constructor() {
    super("현재 주제를 등록할 수 있는 공개 프로그램이 아닙니다.");
    this.name = "ProjectProgramNotOpenError";
  }
}

export class CreateTopicService {
  constructor(
    private readonly topicRepository: TopicCreator,
    private readonly programRepository: Pick<ProjectProgramRepository, "findOpen">,
  ) {}

  async execute(
    actor: CurrentActor,
    input: Omit<TopicDraft, "authorId">,
  ): Promise<{ id: string }> {
    if (!canCreateTopic(actor)) {
      throw new TopicCreationForbiddenError();
    }

    const details = {
      ...input,
      title: input.title.trim(),
      description: input.description.trim(),
      requiredSkills: [...new Set(input.requiredSkills.map((skill) => skill.trim()).filter(Boolean))],
      preferredSkills: [...new Set(input.preferredSkills.map((skill) => skill.trim()).filter(Boolean))],
      roleExpectations: input.roleExpectations.trim(),
      availabilityRequirement: input.availabilityRequirement.trim(),
      applicationQuestions: input.applicationQuestions.map((question) => ({
        ...question,
        label: question.label.trim(),
      })),
    };
    assertValidTopicDetails(details);
    assertValidTopicSchedule(input);

    const program = await this.programRepository.findOpen(input.programId);
    if (!program) {
      throw new ProjectProgramNotOpenError();
    }
    const topicTimes = [input.recruitmentStartsAt, input.recruitmentEndsAt, input.executionStartsAt, input.executionEndsAt, input.submissionStartsAt, input.submissionEndsAt];
    if (topicTimes.some((time) => time < program.startsAt || time > program.endsAt)) {
      throw new ProjectProgramNotOpenError();
    }

    const created = await this.topicRepository.createDraft({
      ...details,
      authorId: actor.id,
    });
    if (!created) {
      throw new ProjectProgramNotOpenError();
    }
    return created;
  }
}
